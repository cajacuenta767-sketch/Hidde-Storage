import 'server-only';

import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accessTypes,
  adminAuditEvents,
  customers,
  offerVariants,
  paymentMethods,
  products,
  renewalRequests,
  subscriptions,
} from '@/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import { getTimeStatus } from '@/lib/subscriptions/dates';

export const renewalStatuses = [
  'pending_payment',
  'payment_review',
  'approved',
  'cancelled',
] as const;

export type RenewalStatus = (typeof renewalStatuses)[number];

export function isRenewalStatus(value: string): value is RenewalStatus {
  return renewalStatuses.includes(value as RenewalStatus);
}

type RenewalFilters = {
  query?: string;
  status?: RenewalStatus | 'all';
  limit?: number;
};

export async function getAdminRenewalRequests({
  query = '',
  status = 'all',
  limit = 100,
}: RenewalFilters = {}) {
  await requireAdmin();
  const conditions: SQL[] = [];
  if (status !== 'all') conditions.push(eq(renewalRequests.status, status));

  const normalizedQuery = query.trim().slice(0, 100);
  if (normalizedQuery) {
    const numericId = Number(normalizedQuery.replace(/^DP-?/i, ''));
    const searchConditions = [
      ilike(customers.fullName, `%${normalizedQuery}%`),
      ilike(customers.email, `%${normalizedQuery}%`),
      ilike(products.serviceName, `%${normalizedQuery}%`),
    ];
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      searchConditions.push(eq(renewalRequests.id, numericId));
    }
    conditions.push(or(...searchConditions)!);
  }

  return db
    .select({
      id: renewalRequests.id,
      subscriptionId: renewalRequests.subscriptionId,
      customerName: customers.fullName,
      customerEmail: customers.email,
      serviceName: products.serviceName,
      planName: products.planName,
      marketCode: subscriptions.marketCode,
      status: renewalRequests.status,
      priceMinor: renewalRequests.priceMinor,
      currency: renewalRequests.currency,
      proposedExpiresAt: renewalRequests.proposedExpiresAt,
      createdAt: renewalRequests.createdAt,
    })
    .from(renewalRequests)
    .innerJoin(customers, eq(renewalRequests.customerId, customers.id))
    .innerJoin(
      subscriptions,
      eq(renewalRequests.subscriptionId, subscriptions.id),
    )
    .innerJoin(products, eq(subscriptions.productId, products.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(renewalRequests.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getAdminRenewalRequest(requestId: number) {
  await requireAdmin();
  const [request] = await db
    .select({
      id: renewalRequests.id,
      subscriptionId: renewalRequests.subscriptionId,
      customerId: renewalRequests.customerId,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phoneE164,
      serviceName: products.serviceName,
      planName: products.planName,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      marketCode: subscriptions.marketCode,
      accessTypeName: accessTypes.name,
      currentStartDate: subscriptions.startDate,
      currentExpiresAt: subscriptions.expiresAt,
      status: renewalRequests.status,
      durationMonths: offerVariants.durationMonths,
      baseExpiresAt: renewalRequests.baseExpiresAt,
      proposedStartDate: renewalRequests.proposedStartDate,
      proposedExpiresAt: renewalRequests.proposedExpiresAt,
      priceMinor: renewalRequests.priceMinor,
      currency: renewalRequests.currency,
      reviewNote: renewalRequests.reviewNote,
      reviewedAt: renewalRequests.reviewedAt,
      createdAt: renewalRequests.createdAt,
    })
    .from(renewalRequests)
    .innerJoin(customers, eq(renewalRequests.customerId, customers.id))
    .innerJoin(
      subscriptions,
      eq(renewalRequests.subscriptionId, subscriptions.id),
    )
    .innerJoin(products, eq(subscriptions.productId, products.id))
    .innerJoin(accessTypes, eq(subscriptions.accessTypeCode, accessTypes.code))
    .innerJoin(
      offerVariants,
      eq(renewalRequests.offerVariantId, offerVariants.id),
    )
    .where(eq(renewalRequests.id, requestId))
    .limit(1);

  return request ?? null;
}

export async function getAdminSubscriptions(limit = 100) {
  await requireAdmin();
  const rows = await db
    .select({
      id: subscriptions.id,
      customerName: customers.fullName,
      serviceName: products.serviceName,
      planName: products.planName,
      accessTypeName: accessTypes.name,
      marketCode: subscriptions.marketCode,
      status: subscriptions.status,
      startDate: subscriptions.startDate,
      expiresAt: subscriptions.expiresAt,
      currency: subscriptions.currency,
      purchasePriceMinor: subscriptions.purchasePriceMinor,
    })
    .from(subscriptions)
    .innerJoin(customers, eq(subscriptions.customerId, customers.id))
    .innerJoin(products, eq(subscriptions.productId, products.id))
    .innerJoin(accessTypes, eq(subscriptions.accessTypeCode, accessTypes.code))
    .orderBy(desc(subscriptions.expiresAt))
    .limit(Math.min(Math.max(limit, 1), 100));

  return rows.map((row) => ({
    ...row,
    marketCode: row.marketCode as 'PE' | 'BO',
    time: getTimeStatus(
      row.startDate,
      row.expiresAt,
      row.marketCode as 'PE' | 'BO',
      row.status,
    ),
  }));
}

export async function getAdminCustomers() {
  await requireAdmin();
  return db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phoneE164: customers.phoneE164,
      marketCode: customers.marketCode,
      status: customers.status,
      lastLoginAt: customers.lastLoginAt,
      createdAt: customers.createdAt,
      subscriptionsCount: sql<number>`count(${subscriptions.id})::int`,
    })
    .from(customers)
    .leftJoin(subscriptions, eq(subscriptions.customerId, customers.id))
    .where(eq(customers.role, 'customer'))
    .groupBy(
      customers.id,
      customers.fullName,
      customers.email,
      customers.phoneE164,
      customers.marketCode,
      customers.status,
      customers.lastLoginAt,
      customers.createdAt,
    )
    .orderBy(desc(customers.createdAt));
}

export async function getAdminPaymentMethods() {
  await requireAdmin();
  return db
    .select({
      code: paymentMethods.code,
      marketCode: paymentMethods.marketCode,
      name: paymentMethods.name,
      instructions: paymentMethods.instructions,
      isActive: paymentMethods.isActive,
    })
    .from(paymentMethods)
    .where(eq(paymentMethods.code, 'WHATSAPP'))
    .orderBy(paymentMethods.marketCode, paymentMethods.sortOrder);
}

export async function getRecentAdminActivity(limit = 6) {
  await requireAdmin();
  return db
    .select({
      id: adminAuditEvents.id,
      action: adminAuditEvents.action,
      summary: adminAuditEvents.summary,
      createdAt: adminAuditEvents.createdAt,
      adminName: customers.fullName,
    })
    .from(adminAuditEvents)
    .innerJoin(customers, eq(adminAuditEvents.adminCustomerId, customers.id))
    .orderBy(desc(adminAuditEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 20));
}

export async function getAdminDashboard() {
  await requireAdmin();
  const [pendingRows, subscriptionRows, customerRows, orders, activity] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(renewalRequests)
        .where(
          inArray(renewalRequests.status, [
            'pending_payment',
            'payment_review',
          ]),
        ),
      db.select({ count: sql<number>`count(*)::int` }).from(subscriptions),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(eq(customers.role, 'customer')),
      getAdminRenewalRequests({ status: 'pending_payment', limit: 5 }),
      getRecentAdminActivity(5),
    ]);

  return {
    summary: {
      pendingPayments: pendingRows[0]?.count ?? 0,
      subscriptions: subscriptionRows[0]?.count ?? 0,
      customers: customerRows[0]?.count ?? 0,
    },
    orders,
    activity,
  };
}
