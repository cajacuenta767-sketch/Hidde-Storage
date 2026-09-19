'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/db/client';
import {
  accountProfiles,
  adminAuditEvents,
  customerNotifications,
  customers,
  offerVariants,
  paymentRecords,
  products,
  profileAssignments,
  renewalRequests,
  subscriptionEvents,
  subscriptions,
} from '@/db/schema';
import { getOfficialRates, toPenSnapshot } from '@/lib/admin/finance';
import { requireAdmin } from '@/lib/auth/session';
import { addMonths, todayForMarket } from '@/lib/subscriptions/dates';

export type AdminActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
};

const confirmationSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  reviewNote: z.string().trim().max(300, 'La nota es demasiado larga.').optional(),
});

export async function confirmRenewalPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const parsed = confirmationSchema.safeParse({
    requestId: formData.get('requestId'),
    reviewNote: formData.get('reviewNote') || undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: 'No pudimos validar la confirmación.' };
  }

  const result = await db.transaction(async (tx): Promise<AdminActionState> => {
    const [record] = await tx
      .select({
        requestId: renewalRequests.id,
        requestStatus: renewalRequests.status,
        subscriptionId: subscriptions.id,
        customerId: customers.id,
        customerName: customers.fullName,
        productId: products.id,
        serviceName: products.serviceName,
        offerVariantId: offerVariants.id,
        durationMonths: offerVariants.durationMonths,
        currentExpiresAt: subscriptions.expiresAt,
        marketCode: subscriptions.marketCode,
        priceMinor: renewalRequests.priceMinor,
        currency: renewalRequests.currency,
        serviceAccountId: accountProfiles.serviceAccountId,
      })
      .from(renewalRequests)
      .innerJoin(subscriptions, eq(renewalRequests.subscriptionId, subscriptions.id))
      .innerJoin(customers, eq(renewalRequests.customerId, customers.id))
      .innerJoin(products, eq(subscriptions.productId, products.id))
      .innerJoin(offerVariants, eq(renewalRequests.offerVariantId, offerVariants.id))
      .leftJoin(
        profileAssignments,
        and(
          eq(profileAssignments.subscriptionId, subscriptions.id),
          eq(profileAssignments.status, 'active'),
        ),
      )
      .leftJoin(accountProfiles, eq(profileAssignments.accountProfileId, accountProfiles.id))
      .where(eq(renewalRequests.id, parsed.data.requestId))
      .limit(1);

    if (!record) return { status: 'error', message: 'El pedido ya no existe.' };
    if (!['pending_payment', 'payment_review'].includes(record.requestStatus)) {
      return { status: 'error', message: 'Este pedido ya fue procesado.' };
    }

    const marketCode = record.marketCode as 'PE' | 'BO';
    const today = todayForMarket(marketCode);
    const renewalBase = record.currentExpiresAt >= today ? record.currentExpiresAt : today;
    const newExpiresAt = addMonths(renewalBase, record.durationMonths);
    const reviewedAt = new Date();
    const paymentSnapshot = toPenSnapshot(
      record.priceMinor,
      record.currency as 'PEN' | 'BOB',
      await getOfficialRates(),
    );

    const [approved] = await tx
      .update(renewalRequests)
      .set({
        status: 'approved',
        baseExpiresAt: renewalBase,
        proposedStartDate: renewalBase,
        proposedExpiresAt: newExpiresAt,
        reviewedByCustomerId: admin.id,
        reviewedAt,
        reviewNote: parsed.data.reviewNote ?? null,
        updatedAt: reviewedAt,
      })
      .where(
        and(
          eq(renewalRequests.id, record.requestId),
          inArray(renewalRequests.status, ['pending_payment', 'payment_review']),
        ),
      )
      .returning({ id: renewalRequests.id });

    if (!approved) {
      return { status: 'error', message: 'El pedido fue procesado desde otra sesión.' };
    }

    await tx
      .update(subscriptions)
      .set({
        offerVariantId: record.offerVariantId,
        status: 'active',
        expiresAt: newExpiresAt,
        warrantyUntil: newExpiresAt,
        durationMonths: record.durationMonths,
        purchasePriceMinor: record.priceMinor,
        updatedAt: reviewedAt,
      })
      .where(eq(subscriptions.id, record.subscriptionId));

    await Promise.all([
      tx.insert(subscriptionEvents).values({
        subscriptionId: record.subscriptionId,
        eventType: 'renewal_approved',
        description: `Renovación de ${record.durationMonths} meses confirmada por administración`,
        previousExpiresAt: record.currentExpiresAt,
        newExpiresAt,
      }),
      tx.insert(customerNotifications).values({
        customerId: record.customerId,
        subscriptionId: record.subscriptionId,
        type: 'renewal_approved',
        title: `${record.serviceName} fue renovado`,
        message: `Tu pago fue confirmado. La nueva fecha de vencimiento es ${newExpiresAt}.`,
        dedupKey: `renewal:${record.requestId}:approved`,
      }),
      tx.insert(paymentRecords).values({
        subscriptionId: record.subscriptionId,
        renewalRequestId: record.requestId,
        serviceAccountId: record.serviceAccountId,
        customerId: record.customerId,
        productId: record.productId,
        marketCode,
        sourceType: 'renewal',
        status: 'confirmed',
        amountMinor: record.priceMinor,
        currency: record.currency,
        reportingAmountMinor: paymentSnapshot.reportingAmountMinor,
        reportingCurrency: 'PEN',
        exchangeRate: paymentSnapshot.exchangeRate,
        paymentMethodCode: 'manual',
        paymentReference: `DP-${String(record.requestId).padStart(6, '0')}`,
        paidAt: reviewedAt,
        confirmedAt: reviewedAt,
        confirmedByAdminCustomerId: admin.id,
      }),
      tx.insert(adminAuditEvents).values({
        adminCustomerId: admin.id,
        action: 'renewal_payment_confirmed',
        entityType: 'renewal_request',
        entityId: record.requestId,
        summary: `Pago DP-${String(record.requestId).padStart(6, '0')} confirmado para ${record.customerName} · ${record.serviceName}`,
      }),
    ]);

    return {
      status: 'success',
      message: `Pago confirmado. La suscripción vence ahora el ${newExpiresAt}.`,
    };
  });

  if (result.status === 'success') {
    revalidatePath('/admin', 'layout');
    revalidatePath('/mi-cuenta', 'layout');
  }
  return result;
}
