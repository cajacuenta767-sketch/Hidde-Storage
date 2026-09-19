import 'server-only';

import { desc, eq, ne } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accessTypes,
  customers,
  durations,
  offerVariants,
  products,
  stockRequests,
} from '@/db/schema';

export type StockRequestGroup = {
  offerVariantId: number;
  serviceName: string;
  planName: string;
  accessTypeCode: string;
  accessTypeName: string;
  durationLabel: string;
  marketCode: 'PE' | 'BO';
  amountMinor: number | null;
  currentStock: number;
  requesters: Array<{
    requestId: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    requestedAt: Date;
  }>;
};

export type ResolvedStockRequest = {
  requestId: number;
  serviceName: string;
  planName: string;
  marketCode: 'PE' | 'BO';
  customerName: string;
  status: string;
  resolvedAt: Date | null;
};

export async function getAdminStockRequestGroups(): Promise<
  StockRequestGroup[]
> {
  const rows = await db
    .select({
      requestId: stockRequests.id,
      requestedAt: stockRequests.createdAt,
      offerVariantId: offerVariants.id,
      serviceName: products.serviceName,
      planName: products.planName,
      accessTypeCode: offerVariants.accessTypeCode,
      accessTypeName: accessTypes.name,
      durationLabel: durations.label,
      marketCode: stockRequests.marketCode,
      amountMinor: offerVariants.amountMinor,
      currentStock: offerVariants.stock,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phoneE164,
    })
    .from(stockRequests)
    .innerJoin(offerVariants, eq(offerVariants.id, stockRequests.offerVariantId))
    .innerJoin(products, eq(products.id, stockRequests.productId))
    .innerJoin(accessTypes, eq(accessTypes.code, offerVariants.accessTypeCode))
    .innerJoin(durations, eq(durations.months, offerVariants.durationMonths))
    .innerJoin(customers, eq(customers.id, stockRequests.customerId))
    .where(eq(stockRequests.status, 'pending'))
    .orderBy(desc(stockRequests.createdAt));

  const groups = new Map<number, StockRequestGroup>();
  for (const row of rows) {
    const marketCode = row.marketCode === 'PE' ? 'PE' : 'BO';
    const group = groups.get(row.offerVariantId) ?? {
      offerVariantId: row.offerVariantId,
      serviceName: row.serviceName,
      planName: row.planName,
      accessTypeCode: row.accessTypeCode,
      accessTypeName: row.accessTypeName,
      durationLabel: row.durationLabel,
      marketCode,
      amountMinor: row.amountMinor,
      currentStock: row.currentStock,
      requesters: [],
    };
    group.requesters.push({
      requestId: row.requestId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      requestedAt: row.requestedAt,
    });
    groups.set(row.offerVariantId, group);
  }

  return Array.from(groups.values()).sort(
    (left, right) => right.requesters.length - left.requesters.length,
  );
}

export async function getRecentResolvedStockRequests(
  limit = 8,
): Promise<ResolvedStockRequest[]> {
  const rows = await db
    .select({
      requestId: stockRequests.id,
      serviceName: products.serviceName,
      planName: products.planName,
      marketCode: stockRequests.marketCode,
      customerName: customers.fullName,
      status: stockRequests.status,
      resolvedAt: stockRequests.resolvedAt,
    })
    .from(stockRequests)
    .innerJoin(products, eq(products.id, stockRequests.productId))
    .innerJoin(customers, eq(customers.id, stockRequests.customerId))
    .where(ne(stockRequests.status, 'pending'))
    .orderBy(desc(stockRequests.resolvedAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    marketCode: row.marketCode === 'PE' ? 'PE' : 'BO',
  }));
}
