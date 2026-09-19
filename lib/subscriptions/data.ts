import 'server-only';

import { and, asc, desc, eq, gt, isNotNull, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accessTypes,
  customerNotifications,
  offerVariants,
  products,
  renewalRequests,
  subscriptionEvents,
  subscriptions,
} from '@/db/schema';
import { getTimeStatus, todayForMarket } from '@/lib/subscriptions/dates';

export type CustomerSubscription = Awaited<ReturnType<typeof getCustomerSubscriptions>>[number];

export async function getCustomerSubscriptions(customerId: number) {
  const rows = await db
    .select({
      id: subscriptions.id,
      productId: subscriptions.productId,
      offerVariantId: subscriptions.offerVariantId,
      serviceName: products.serviceName,
      planName: products.planName,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      status: subscriptions.status,
      startDate: subscriptions.startDate,
      expiresAt: subscriptions.expiresAt,
      warrantyUntil: subscriptions.warrantyUntil,
      accessTypeCode: subscriptions.accessTypeCode,
      accessTypeName: accessTypes.name,
      durationMonths: subscriptions.durationMonths,
      marketCode: subscriptions.marketCode,
      purchasePriceMinor: subscriptions.purchasePriceMinor,
      currency: subscriptions.currency,
    })
    .from(subscriptions)
    .innerJoin(products, eq(subscriptions.productId, products.id))
    .innerJoin(accessTypes, eq(subscriptions.accessTypeCode, accessTypes.code))
    .where(eq(subscriptions.customerId, customerId))
    .orderBy(desc(subscriptions.expiresAt), asc(products.serviceName));

  return rows.map((row) => {
    const marketCode = row.marketCode as 'PE' | 'BO';
    return {
      ...row,
      marketCode,
      currency: row.currency as 'PEN' | 'BOB',
      price: row.purchasePriceMinor / 100,
      time: getTimeStatus(row.startDate, row.expiresAt, marketCode, row.status),
    };
  });
}

export async function syncExpiryNotifications(
  customerId: number,
  customerSubscriptions: Awaited<ReturnType<typeof getCustomerSubscriptions>>,
) {
  const thresholds = new Set([7, 3, 1, 0]);
  const pending = customerSubscriptions.filter(
    (subscription) => thresholds.has(subscription.time.daysRemaining) && subscription.status !== 'cancelled',
  );
  if (pending.length === 0) return;

  await db
    .insert(customerNotifications)
    .values(
      pending.map((subscription) => ({
        customerId,
        subscriptionId: subscription.id,
        type: subscription.time.daysRemaining <= 1 ? 'expiry_urgent' : 'expiry_warning',
        title:
          subscription.time.daysRemaining === 0
            ? `${subscription.serviceName} vence hoy`
            : `${subscription.serviceName} vence pronto`,
        message:
          subscription.time.daysRemaining === 0
            ? 'Renueva hoy para mantener la continuidad de tu servicio.'
            : `Quedan ${subscription.time.daysRemaining} ${subscription.time.daysRemaining === 1 ? 'día' : 'días'} de tu plan.`,
        dedupKey: `subscription:${subscription.id}:expiry:${subscription.time.daysRemaining}`,
      })),
    )
    .onConflictDoNothing();
}

export async function getCustomerNotifications(customerId: number, limit = 30) {
  return db
    .select({
      id: customerNotifications.id,
      subscriptionId: customerNotifications.subscriptionId,
      type: customerNotifications.type,
      title: customerNotifications.title,
      message: customerNotifications.message,
      readAt: customerNotifications.readAt,
      createdAt: customerNotifications.createdAt,
    })
    .from(customerNotifications)
    .where(eq(customerNotifications.customerId, customerId))
    .orderBy(desc(customerNotifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(customerId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customerNotifications)
    .where(
      and(
        eq(customerNotifications.customerId, customerId),
        isNull(customerNotifications.readAt),
      ),
    );
  return row?.count ?? 0;
}

export async function getCustomerRenewalRequests(customerId: number) {
  return db
    .select({
      id: renewalRequests.id,
      subscriptionId: renewalRequests.subscriptionId,
      serviceName: products.serviceName,
      planName: products.planName,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      status: renewalRequests.status,
      proposedExpiresAt: renewalRequests.proposedExpiresAt,
      priceMinor: renewalRequests.priceMinor,
      currency: renewalRequests.currency,
      createdAt: renewalRequests.createdAt,
    })
    .from(renewalRequests)
    .innerJoin(subscriptions, eq(renewalRequests.subscriptionId, subscriptions.id))
    .innerJoin(products, eq(subscriptions.productId, products.id))
    .where(eq(renewalRequests.customerId, customerId))
    .orderBy(desc(renewalRequests.createdAt));
}

export async function getCustomerDashboard(customerId: number) {
  const customerSubscriptions = await getCustomerSubscriptions(customerId);
  await syncExpiryNotifications(customerId, customerSubscriptions);
  const [notifications, unread, renewalRows] = await Promise.all([
    getCustomerNotifications(customerId, 8),
    getUnreadNotificationCount(customerId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(renewalRequests)
      .where(
        and(
          eq(renewalRequests.customerId, customerId),
          eq(renewalRequests.status, 'pending_payment'),
        ),
      ),
  ]);

  return {
    subscriptions: customerSubscriptions,
    notifications,
    summary: {
      active: customerSubscriptions.filter((item) => item.time.daysRemaining >= 0 && item.status === 'active').length,
      expiring: customerSubscriptions.filter((item) => item.time.daysRemaining >= 0 && item.time.daysRemaining <= 7).length,
      unread,
      pendingRenewals: renewalRows[0]?.count ?? 0,
    },
  };
}

export async function getCustomerSubscription(customerId: number, subscriptionId: number) {
  const subscriptionsForCustomer = await getCustomerSubscriptions(customerId);
  const subscription = subscriptionsForCustomer.find((item) => item.id === subscriptionId) ?? null;
  if (!subscription) return null;

  const [events, renewals, renewalOptions] = await Promise.all([
    db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionEvents.createdAt)),
    db
      .select()
      .from(renewalRequests)
      .where(
        and(
          eq(renewalRequests.subscriptionId, subscriptionId),
          eq(renewalRequests.customerId, customerId),
        ),
      )
      .orderBy(desc(renewalRequests.createdAt)),
    db
      .select({
        id: offerVariants.id,
        durationMonths: offerVariants.durationMonths,
        amountMinor: offerVariants.amountMinor,
        compareAtAmountMinor: offerVariants.compareAtAmountMinor,
        discountBasisPoints: offerVariants.discountBasisPoints,
      })
      .from(offerVariants)
      .where(
        and(
          eq(offerVariants.productId, subscription.productId),
          eq(offerVariants.accessTypeCode, subscription.accessTypeCode),
          eq(offerVariants.marketCode, subscription.marketCode),
          eq(offerVariants.isActive, true),
          isNotNull(offerVariants.amountMinor),
          gt(offerVariants.stock, 0),
        ),
      )
      .orderBy(asc(offerVariants.durationMonths)),
  ]);

  return {
    subscription,
    events,
    renewals,
    renewalOptions: renewalOptions.map((option) => ({
      id: option.id,
      durationMonths: option.durationMonths,
      price: (option.amountMinor ?? 0) / 100,
      regularPrice: (option.compareAtAmountMinor ?? option.amountMinor ?? 0) / 100,
      discountPercent: option.discountBasisPoints / 100,
    })),
  };
}

export async function getTodayForSubscription(subscription: CustomerSubscription) {
  return todayForMarket(subscription.marketCode);
}
