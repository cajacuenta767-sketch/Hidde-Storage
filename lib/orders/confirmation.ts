import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accountProfiles,
  adminAuditEvents,
  customerNotifications,
  paymentAttempts,
  paymentRecords,
  profileAssignments,
  purchaseOrderItems,
  purchaseOrders,
  subscriptionEvents,
  subscriptions,
} from '@/db/schema';
import { getOfficialRates, toPenSnapshot } from '@/lib/admin/finance';
import {
  notifyTelegramPaymentNeedsInventory,
  notifyTelegramTokenIssued,
} from '@/lib/integrations/telegram';
import { issueDeliveryToken } from '@/lib/orders/delivery';
import { releaseExpiredProfileReservationsQuery } from '@/lib/orders/reservations';
import { addMonths, todayForMarket } from '@/lib/subscriptions/dates';

export type PaymentConfirmationResult = {
  ok: boolean;
  message: string;
  token?: string;
};

async function confirmPaymentAndAssign(input: {
  publicId: string;
  adminCustomerId: number;
  reviewNote?: string;
}) {
  const rates = await getOfficialRates();
  return db.transaction(async (tx) => {
    await tx.execute(releaseExpiredProfileReservationsQuery());

    const [order] = await tx
      .select({
        id: purchaseOrders.id,
        publicId: purchaseOrders.publicId,
        customerId: purchaseOrders.customerId,
        marketCode: purchaseOrders.marketCode,
        currency: purchaseOrders.currency,
        status: purchaseOrders.status,
        paymentMethodCode: purchaseOrders.paymentMethodCode,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.publicId, input.publicId))
      .limit(1);
    if (!order) return { ok: false as const, message: 'El pedido no existe.' };
    if (!['pending_payment', 'payment_review'].includes(order.status)) {
      return { ok: false as const, message: 'Este pedido ya fue procesado.' };
    }

    const [locked] = await tx
      .update(purchaseOrders)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(purchaseOrders.id, order.id),
          inArray(purchaseOrders.status, ['pending_payment', 'payment_review']),
        ),
      )
      .returning({ id: purchaseOrders.id });
    if (!locked) {
      return { ok: false as const, message: 'Otro administrador procesó el pedido.' };
    }

    const items = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, order.id));
    const marketCode = order.marketCode === 'PE' ? 'PE' : 'BO';
    const today = todayForMarket(marketCode);
    let allAssigned = true;

    for (const item of items) {
      const expiresAt = addMonths(today, item.durationMonths);
      const available = await tx.execute<{
        profileId: number;
        serviceAccountId: number;
      }>(sql`
        select profile.id as "profileId", account.id as "serviceAccountId"
        from account_profiles profile
        join service_accounts account on account.id = profile.service_account_id
        left join profile_reservations reservation
          on reservation.account_profile_id = profile.id
         and reservation.status = 'active'
         and reservation.expires_at > now()
        where account.product_id = ${item.productId}
          and account.status = 'active'
          and (${item.accessTypeCode} = 'PROFILE' or account.capacity = 1)
          and (
            profile.status = 'available'
            or (
              profile.status = 'reserved'
              and reservation.order_item_id = ${item.id}
            )
          )
        order by
          case when reservation.order_item_id = ${item.id} then 0 else 1 end,
          account.renewal_date nulls last,
          account.id,
          profile.position
        for update of profile skip locked
        limit 1
      `);
      const profileId = available[0]?.profileId ?? null;
      const serviceAccountId = available[0]?.serviceAccountId ?? null;
      const assigned = Boolean(profileId);
      if (!assigned) allAssigned = false;

      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          customerId: order.customerId,
          productId: item.productId,
          offerVariantId: item.offerVariantId,
          status: 'pending',
          startDate: today,
          expiresAt,
          warrantyUntil: expiresAt,
          accessTypeCode: item.accessTypeCode,
          durationMonths: item.durationMonths,
          marketCode,
          purchasePriceMinor: item.amountMinor,
          currency: order.currency,
        })
        .returning({ id: subscriptions.id });

      if (profileId) {
        await tx.execute(sql`
          update profile_reservations
          set status = 'consumed', consumed_at = now(), updated_at = now()
          where account_profile_id = ${profileId}
            and order_item_id = ${item.id}
            and status = 'active'
        `);
        await tx
          .update(accountProfiles)
          .set({ status: 'assigned', updatedAt: new Date() })
          .where(eq(accountProfiles.id, profileId));
        await tx.insert(profileAssignments).values({
          accountProfileId: profileId,
          subscriptionId: subscription.id,
          customerId: order.customerId,
          status: 'active',
          startsAt: today,
          expiresAt,
          assignedByAdminCustomerId: input.adminCustomerId,
          assignmentSource: 'manual',
        });
      }

      await tx
        .update(purchaseOrderItems)
        .set({
          subscriptionId: subscription.id,
          status: assigned ? 'fulfilled' : 'review',
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrderItems.id, item.id));
      await tx.insert(subscriptionEvents).values({
        subscriptionId: subscription.id,
        eventType: assigned ? 'subscription_activated' : 'awaiting_inventory',
        description: assigned
          ? `Pago manual confirmado para ${order.publicId}`
          : `Pago confirmado; acceso pendiente de asignación para ${order.publicId}`,
        newExpiresAt: expiresAt,
      });
      const reporting = toPenSnapshot(
        item.amountMinor,
        order.currency as 'PEN' | 'BOB',
        rates,
      );
      await tx.insert(paymentRecords).values({
        subscriptionId: subscription.id,
        serviceAccountId,
        customerId: order.customerId,
        productId: item.productId,
        marketCode,
        sourceType: 'initial_purchase',
        status: 'confirmed',
        amountMinor: item.amountMinor,
        currency: order.currency,
        reportingAmountMinor: reporting.reportingAmountMinor,
        reportingCurrency: 'PEN',
        exchangeRate: reporting.exchangeRate,
        paymentMethodCode: order.paymentMethodCode,
        paymentReference: order.publicId,
        paidAt: new Date(),
        confirmedAt: new Date(),
        confirmedByAdminCustomerId: input.adminCustomerId,
        confirmationSource: 'manual',
      });
    }

    await tx
      .update(paymentAttempts)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(paymentAttempts.orderId, order.id));
    await tx
      .update(purchaseOrders)
      .set({
        status: allAssigned ? 'paid' : 'fulfilling',
        fulfilledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, order.id));
    await tx.insert(customerNotifications).values({
      customerId: order.customerId,
      type: 'purchase_preparing',
      title: 'Pago confirmado',
      message: allAssigned
        ? `El pago del pedido ${order.publicId} fue confirmado. Recibirás un token para liberar el acceso.`
        : `Estamos preparando el acceso del pedido ${order.publicId}.`,
      dedupKey: `purchase:${order.id}:confirmed`,
    });
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: input.adminCustomerId,
      action: 'purchase_payment_confirmed',
      entityType: 'purchase_order',
      entityId: order.id,
      summary:
        `Pago manual ${order.publicId} confirmado. ${input.reviewNote ?? ''}`.trim(),
    });
    return { ok: true as const, allAssigned };
  });
}

export async function confirmPaymentAndDeliver(input: {
  publicId: string;
  adminCustomerId: number;
  source: 'admin' | 'telegram';
  reviewNote?: string;
}): Promise<PaymentConfirmationResult> {
  const confirmation = await confirmPaymentAndAssign(input);
  if (!confirmation.ok) return confirmation;
  if (!confirmation.allAssigned) {
    await notifyTelegramPaymentNeedsInventory(input.publicId);
    return {
      ok: true,
      message: 'Pago confirmado, pero falta asignar una cuenta o perfil.',
    };
  }

  const tokenResult = await issueDeliveryToken({
    publicId: input.publicId,
    adminCustomerId: input.adminCustomerId,
    source: input.source,
  });
  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.error };
  }
  const sent = await notifyTelegramTokenIssued({
    publicId: input.publicId,
    token: tokenResult.token,
    expiresAt: tokenResult.expiresAt,
  });
  return {
    ok: true,
    token: tokenResult.token,
    message: sent
      ? 'Pago confirmado. Token generado y enviado a Telegram.'
      : 'Pago confirmado y token generado, pero Telegram no respondió.',
  };
}

async function retryFulfillingOrderAssignments(input: {
  publicId: string;
  adminCustomerId: number;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(releaseExpiredProfileReservationsQuery());

    const [order] = await tx
      .select({
        id: purchaseOrders.id,
        customerId: purchaseOrders.customerId,
        status: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.publicId, input.publicId))
      .limit(1);
    if (!order) return { ok: false as const, message: 'El pedido no existe.' };
    if (order.status !== 'fulfilling') {
      return {
        ok: false as const,
        message: 'Este pedido ya no está esperando inventario.',
      };
    }

    const pendingItems = await tx
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        subscriptionId: purchaseOrderItems.subscriptionId,
        accessTypeCode: purchaseOrderItems.accessTypeCode,
        startDate: subscriptions.startDate,
        expiresAt: subscriptions.expiresAt,
      })
      .from(purchaseOrderItems)
      .innerJoin(
        subscriptions,
        eq(subscriptions.id, purchaseOrderItems.subscriptionId),
      )
      .where(
        and(
          eq(purchaseOrderItems.orderId, order.id),
          eq(purchaseOrderItems.status, 'review'),
        ),
      );

    for (const item of pendingItems) {
      if (!item.subscriptionId) continue;
      const available = await tx.execute<{
        profileId: number;
        serviceAccountId: number;
      }>(sql`
        select profile.id as "profileId", account.id as "serviceAccountId"
        from account_profiles profile
        join service_accounts account on account.id = profile.service_account_id
        where account.product_id = ${item.productId}
          and account.status = 'active'
          and (${item.accessTypeCode} = 'PROFILE' or account.capacity = 1)
          and profile.status = 'available'
        order by account.renewal_date nulls last, account.id, profile.position
        for update of profile skip locked
        limit 1
      `);
      const profileId = available[0]?.profileId;
      const serviceAccountId = available[0]?.serviceAccountId;
      if (!profileId || !serviceAccountId) continue;

      await tx
        .update(accountProfiles)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(eq(accountProfiles.id, profileId));
      await tx.insert(profileAssignments).values({
        accountProfileId: profileId,
        subscriptionId: item.subscriptionId,
        customerId: order.customerId,
        status: 'active',
        startsAt: item.startDate,
        expiresAt: item.expiresAt,
        assignedByAdminCustomerId: input.adminCustomerId,
        assignmentSource: 'automatic',
      });
      await tx
        .update(purchaseOrderItems)
        .set({ status: 'fulfilled', updatedAt: new Date() })
        .where(eq(purchaseOrderItems.id, item.id));
      await tx
        .update(paymentRecords)
        .set({ serviceAccountId, updatedAt: new Date() })
        .where(
          and(
            eq(paymentRecords.subscriptionId, item.subscriptionId),
            eq(paymentRecords.status, 'confirmed'),
          ),
        );
      await tx.insert(subscriptionEvents).values({
        subscriptionId: item.subscriptionId,
        eventType: 'inventory_assigned_after_payment',
        description: `Inventario asignado automáticamente para ${input.publicId}`,
      });
    }

    const remaining = await tx.execute<{ count: number }>(sql`
      select count(*)::int as count
      from purchase_order_items
      where order_id = ${order.id} and status = 'review'
    `);
    const allAssigned = (remaining[0]?.count ?? 0) === 0;
    if (allAssigned) {
      await tx
        .update(purchaseOrders)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(eq(purchaseOrders.id, order.id));
    }
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: input.adminCustomerId,
      action: 'purchase_inventory_retried',
      entityType: 'purchase_order',
      entityId: order.id,
      summary: allAssigned
        ? `Inventario completado para ${input.publicId}`
        : `Reintento de inventario aún pendiente para ${input.publicId}`,
    });
    return { ok: true as const, allAssigned };
  });
}

export async function retryFulfillingOrderDelivery(input: {
  publicId: string;
  adminCustomerId: number;
  source: 'admin' | 'telegram';
}): Promise<PaymentConfirmationResult> {
  const retry = await retryFulfillingOrderAssignments(input);
  if (!retry.ok) return retry;
  if (!retry.allAssigned) {
    await notifyTelegramPaymentNeedsInventory(input.publicId);
    return { ok: false, message: 'Todavía no existe un perfil disponible.' };
  }

  const tokenResult = await issueDeliveryToken({
    publicId: input.publicId,
    adminCustomerId: input.adminCustomerId,
    source: input.source,
  });
  if (!tokenResult.ok) return { ok: false, message: tokenResult.error };
  await notifyTelegramTokenIssued({
    publicId: input.publicId,
    token: tokenResult.token,
    expiresAt: tokenResult.expiresAt,
  });
  return {
    ok: true,
    token: tokenResult.token,
    message: 'Inventario asignado. Token generado y enviado a Telegram.',
  };
}
