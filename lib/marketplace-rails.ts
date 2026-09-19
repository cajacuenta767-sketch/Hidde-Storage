import 'server-only';

import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { cache } from 'react';

import { db } from '@/db/client';
import {
  products,
  purchaseOrderItems,
  purchaseOrders,
  stockRequests,
} from '@/db/schema';
import type { MarketplaceRailsData } from '@/lib/catalog-types';

const RAIL_LIMIT = 12;
const SALES_WINDOW_DAYS = 30;
const RESTOCK_WINDOW_DAYS = 14;

export const getMarketplaceRails = cache(
  async (): Promise<MarketplaceRailsData> => {
    const salesSince = new Date(
      Date.now() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const restockSince = new Date(
      Date.now() - RESTOCK_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [bestSellers, newArrivals, restocked] = await Promise.all([
      db
        .select({
          productId: purchaseOrderItems.productId,
          total: count(),
        })
        .from(purchaseOrderItems)
        .innerJoin(
          purchaseOrders,
          eq(purchaseOrders.id, purchaseOrderItems.orderId),
        )
        .where(gte(purchaseOrders.createdAt, salesSince))
        .groupBy(purchaseOrderItems.productId)
        .orderBy(desc(count()))
        .limit(RAIL_LIMIT),
      db
        .select({ productId: products.id })
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.createdAt), desc(products.id))
        .limit(RAIL_LIMIT),
      db
        .select({
          productId: stockRequests.productId,
          lastResolvedAt: sql<string>`max(${stockRequests.resolvedAt})`,
        })
        .from(stockRequests)
        .where(
          and(
            eq(stockRequests.status, 'fulfilled'),
            gte(stockRequests.resolvedAt, restockSince),
          ),
        )
        .groupBy(stockRequests.productId)
        .orderBy(desc(sql`max(${stockRequests.resolvedAt})`))
        .limit(RAIL_LIMIT),
    ]);

    return {
      bestSellerProductIds: bestSellers.map((row) => row.productId),
      newArrivalProductIds: newArrivals.map((row) => row.productId),
      restockedProductIds: restocked.map((row) => row.productId),
    };
  },
);
