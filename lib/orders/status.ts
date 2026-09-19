import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  paymentAttempts,
  products,
  purchaseOrderItems,
  purchaseOrders,
} from '@/db/schema';
import { releaseOrderReservations } from '@/lib/orders/checkout';

export async function expirePurchaseOrder(orderId: number) {
  const [expired] = await db
    .update(purchaseOrders)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(purchaseOrders.id, orderId),
        eq(purchaseOrders.status, 'pending_payment'),
      ),
    )
    .returning({ id: purchaseOrders.id });

  if (!expired) return;
  await db
    .update(paymentAttempts)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(paymentAttempts.orderId, orderId),
        eq(paymentAttempts.status, 'pending'),
      ),
    );
  await releaseOrderReservations(orderId, 'expired');
}

export async function getCustomerOrder(customerId: number, publicId: string) {
  let [order] = await db
    .select({
      id: purchaseOrders.id,
      publicId: purchaseOrders.publicId,
      status: purchaseOrders.status,
      marketCode: purchaseOrders.marketCode,
      currency: purchaseOrders.currency,
      totalAmountMinor: purchaseOrders.totalAmountMinor,
      paymentMethodCode: purchaseOrders.paymentMethodCode,
      expiresAt: purchaseOrders.expiresAt,
      paidAt: purchaseOrders.paidAt,
      fulfilledAt: purchaseOrders.fulfilledAt,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.publicId, publicId),
        eq(purchaseOrders.customerId, customerId),
      ),
    )
    .limit(1);

  if (!order) return null;
  if (
    order.status === 'pending_payment' &&
    order.expiresAt.getTime() <= Date.now()
  ) {
    await expirePurchaseOrder(order.id);
    [order] = await db
      .select({
        id: purchaseOrders.id,
        publicId: purchaseOrders.publicId,
        status: purchaseOrders.status,
        marketCode: purchaseOrders.marketCode,
        currency: purchaseOrders.currency,
        totalAmountMinor: purchaseOrders.totalAmountMinor,
        paymentMethodCode: purchaseOrders.paymentMethodCode,
        expiresAt: purchaseOrders.expiresAt,
        paidAt: purchaseOrders.paidAt,
        fulfilledAt: purchaseOrders.fulfilledAt,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, order.id))
      .limit(1);
  }

  const [items, attempts] = await Promise.all([
    db
      .select({
        id: purchaseOrderItems.id,
        serviceName: purchaseOrderItems.serviceName,
        planName: purchaseOrderItems.planName,
        accessTypeCode: purchaseOrderItems.accessTypeCode,
        durationMonths: purchaseOrderItems.durationMonths,
        amountMinor: purchaseOrderItems.amountMinor,
        status: purchaseOrderItems.status,
        subscriptionId: purchaseOrderItems.subscriptionId,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, order.id))
      .orderBy(asc(purchaseOrderItems.id)),
    db
      .select({
        provider: paymentAttempts.provider,
        status: paymentAttempts.status,
        providerState: paymentAttempts.providerState,
        paymentCode: paymentAttempts.paymentCode,
      })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, order.id))
      .orderBy(asc(paymentAttempts.id)),
  ]);

  return {
    orderId: order.publicId,
    status: order.status,
    marketCode: order.marketCode,
    currency: order.currency,
    amountMinor: order.totalAmountMinor,
    paymentMethodCode: order.paymentMethodCode,
    expiresAt: order.expiresAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items,
    payment: attempts.at(-1) ?? null,
  };
}

export async function getCustomerPurchaseOrders(customerId: number) {
  const rows = await db
    .select({
      id: purchaseOrders.id,
      publicId: purchaseOrders.publicId,
      status: purchaseOrders.status,
      marketCode: purchaseOrders.marketCode,
      currency: purchaseOrders.currency,
      totalAmountMinor: purchaseOrders.totalAmountMinor,
      paymentMethodCode: purchaseOrders.paymentMethodCode,
      expiresAt: purchaseOrders.expiresAt,
      createdAt: purchaseOrders.createdAt,
      itemId: purchaseOrderItems.id,
      serviceName: purchaseOrderItems.serviceName,
      planName: purchaseOrderItems.planName,
      subscriptionId: purchaseOrderItems.subscriptionId,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
    })
    .from(purchaseOrders)
    .innerJoin(
      purchaseOrderItems,
      eq(purchaseOrderItems.orderId, purchaseOrders.id),
    )
    .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
    .where(eq(purchaseOrders.customerId, customerId))
    .orderBy(asc(purchaseOrders.id), asc(purchaseOrderItems.id));

  const grouped = new Map<
    number,
    {
      id: number;
      publicId: string;
      status: string;
      marketCode: string;
      currency: string;
      totalAmountMinor: number;
      paymentMethodCode: string;
      expiresAt: Date;
      createdAt: Date;
      imagePath: string;
      imageAlt: string;
      items: Array<{
        id: number;
        serviceName: string;
        planName: string;
        subscriptionId: number | null;
      }>;
    }
  >();

  for (const row of rows) {
    const current = grouped.get(row.id) ?? {
      id: row.id,
      publicId: row.publicId,
      status: row.status,
      marketCode: row.marketCode,
      currency: row.currency,
      totalAmountMinor: row.totalAmountMinor,
      paymentMethodCode: row.paymentMethodCode,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      imagePath: row.imagePath,
      imageAlt: row.imageAlt,
      items: [],
    };
    current.items.push({
      id: row.itemId,
      serviceName: row.serviceName,
      planName: row.planName,
      subscriptionId: row.subscriptionId,
    });
    grouped.set(row.id, current);
  }

  return Array.from(grouped.values()).sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}
