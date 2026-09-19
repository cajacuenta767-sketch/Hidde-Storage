import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  customers,
  deliveryTokens,
  paymentAttempts,
  products,
  purchaseOrderItems,
  purchaseOrders,
} from '@/db/schema';

export async function getAdminPurchaseOrders() {
  const rows = await db
    .select({
      id: purchaseOrders.id,
      publicId: purchaseOrders.publicId,
      status: purchaseOrders.status,
      marketCode: purchaseOrders.marketCode,
      currency: purchaseOrders.currency,
      totalAmountMinor: purchaseOrders.totalAmountMinor,
      paymentMethodCode: purchaseOrders.paymentMethodCode,
      createdAt: purchaseOrders.createdAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      serviceName: purchaseOrderItems.serviceName,
    })
    .from(purchaseOrders)
    .innerJoin(customers, eq(customers.id, purchaseOrders.customerId))
    .innerJoin(
      purchaseOrderItems,
      eq(purchaseOrderItems.orderId, purchaseOrders.id),
    )
    .orderBy(desc(purchaseOrders.createdAt), asc(purchaseOrderItems.id));

  const grouped = new Map<
    number,
    Omit<(typeof rows)[number], 'serviceName'> & { services: string[] }
  >();
  for (const row of rows) {
    const current = grouped.get(row.id) ?? { ...row, services: [] };
    if (!current.services.includes(row.serviceName))
      current.services.push(row.serviceName);
    grouped.set(row.id, current);
  }
  return Array.from(grouped.values());
}

export async function getAdminPurchaseOrder(publicId: string) {
  const [order] = await db
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
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phoneE164,
      provider: paymentAttempts.provider,
      paymentStatus: paymentAttempts.status,
      providerState: paymentAttempts.providerState,
      providerOrderId: paymentAttempts.providerOrderId,
    })
    .from(purchaseOrders)
    .innerJoin(customers, eq(customers.id, purchaseOrders.customerId))
    .leftJoin(paymentAttempts, eq(paymentAttempts.orderId, purchaseOrders.id))
    .where(eq(purchaseOrders.publicId, publicId))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      id: purchaseOrderItems.id,
      serviceName: purchaseOrderItems.serviceName,
      planName: purchaseOrderItems.planName,
      accessTypeCode: purchaseOrderItems.accessTypeCode,
      durationMonths: purchaseOrderItems.durationMonths,
      amountMinor: purchaseOrderItems.amountMinor,
      status: purchaseOrderItems.status,
      subscriptionId: purchaseOrderItems.subscriptionId,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
    })
    .from(purchaseOrderItems)
    .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
    .where(eq(purchaseOrderItems.orderId, order.id))
    .orderBy(asc(purchaseOrderItems.id));

  const [deliveryToken] = await db
    .select({
      status: deliveryTokens.status,
      attempts: deliveryTokens.attempts,
      maxAttempts: deliveryTokens.maxAttempts,
      expiresAt: deliveryTokens.expiresAt,
      usedAt: deliveryTokens.usedAt,
      createdAt: deliveryTokens.createdAt,
    })
    .from(deliveryTokens)
    .where(
      and(
        eq(deliveryTokens.orderId, order.id),
        eq(deliveryTokens.status, 'active'),
      ),
    )
    .orderBy(desc(deliveryTokens.createdAt))
    .limit(1);

  return { ...order, items, deliveryToken: deliveryToken ?? null };
}
