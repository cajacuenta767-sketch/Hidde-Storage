import 'server-only';

import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { cache } from 'react';

import { db } from '@/db/client';
import { offerVariants, products, promotions } from '@/db/schema';
import type {
  MarketCode,
  PromoAnnouncement,
  PromoBanner,
  PromotionsData,
} from '@/lib/catalog-types';

const FALLBACK_BANNERS_PER_MARKET = 4;

function toMarketCode(value: string | null): MarketCode | null {
  return value === 'PE' || value === 'BO' ? value : null;
}

function formatMoney(marketCode: MarketCode, amountMinor: number) {
  return new Intl.NumberFormat(marketCode === 'PE' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency: marketCode === 'PE' ? 'PEN' : 'BOB',
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

async function getFallbackBanners(): Promise<PromoBanner[]> {
  const rows = await db
    .select({
      variantId: offerVariants.id,
      productId: offerVariants.productId,
      marketCode: offerVariants.marketCode,
      amountMinor: offerVariants.amountMinor,
      durationMonths: offerVariants.durationMonths,
      discountBasisPoints: offerVariants.discountBasisPoints,
      serviceName: products.serviceName,
      planName: products.planName,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      accent: products.accentColor,
      accentSoft: products.accentSoftColor,
      mark: products.mark,
    })
    .from(offerVariants)
    .innerJoin(products, eq(products.id, offerVariants.productId))
    .where(
      and(
        eq(offerVariants.isActive, true),
        eq(products.isActive, true),
        gt(offerVariants.stock, 0),
        gt(offerVariants.discountBasisPoints, 0),
        isNotNull(offerVariants.amountMinor),
        inArray(offerVariants.marketCode, ['PE', 'BO']),
      ),
    )
    .orderBy(desc(offerVariants.discountBasisPoints), asc(offerVariants.amountMinor))
    .limit(60);

  const banners: PromoBanner[] = [];
  const perMarket: Record<MarketCode, Set<number>> = {
    PE: new Set(),
    BO: new Set(),
  };
  for (const row of rows) {
    const marketCode = toMarketCode(row.marketCode);
    if (!marketCode || row.amountMinor === null) continue;
    const seen = perMarket[marketCode];
    if (seen.has(row.productId) || seen.size >= FALLBACK_BANNERS_PER_MARKET) {
      continue;
    }
    seen.add(row.productId);
    const discountPercent = Math.round(row.discountBasisPoints / 100);
    banners.push({
      id: `fallback-${row.variantId}`,
      title: `${row.serviceName} ${row.planName}`,
      subtitle: `${formatMoney(marketCode, row.amountMinor)} por ${row.durationMonths} ${row.durationMonths === 1 ? 'mes' : 'meses'}`,
      ctaLabel: 'Ver oferta',
      marketCode,
      productId: row.productId,
      serviceName: row.serviceName,
      planName: row.planName,
      imagePath: row.imagePath,
      imageAlt: row.imageAlt,
      accent: row.accent,
      accentSoft: row.accentSoft,
      mark: row.mark,
      discountPercent,
    });
  }
  return banners;
}

export const getActivePromotions = cache(async (): Promise<PromotionsData> => {
  const now = new Date();
  const rows = await db
    .select({
      id: promotions.id,
      kind: promotions.kind,
      title: promotions.title,
      subtitle: promotions.subtitle,
      ctaLabel: promotions.ctaLabel,
      marketCode: promotions.marketCode,
      productId: promotions.productId,
      serviceName: products.serviceName,
      planName: products.planName,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      accent: products.accentColor,
      accentSoft: products.accentSoftColor,
      mark: products.mark,
    })
    .from(promotions)
    .leftJoin(products, eq(products.id, promotions.productId))
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
      ),
    )
    .orderBy(asc(promotions.sortOrder), asc(promotions.createdAt));

  const announcements: PromoAnnouncement[] = [];
  const banners: PromoBanner[] = [];
  for (const row of rows) {
    if (row.kind === 'announcement') {
      announcements.push({
        id: String(row.id),
        title: row.title,
        marketCode: toMarketCode(row.marketCode),
      });
      continue;
    }
    banners.push({
      id: String(row.id),
      title: row.title,
      subtitle: row.subtitle,
      ctaLabel: row.ctaLabel,
      marketCode: toMarketCode(row.marketCode),
      productId: row.productId,
      serviceName: row.serviceName,
      planName: row.planName,
      imagePath: row.imagePath,
      imageAlt: row.imageAlt,
      accent: row.accent,
      accentSoft: row.accentSoft,
      mark: row.mark,
      discountPercent: null,
    });
  }

  return {
    announcements,
    banners: banners.length > 0 ? banners : await getFallbackBanners(),
  };
});

export type AdminPromotionRow = {
  id: number;
  kind: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  productId: number | null;
  productLabel: string | null;
  marketCode: string | null;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export async function getAdminPromotions(): Promise<AdminPromotionRow[]> {
  const rows = await db
    .select({
      id: promotions.id,
      kind: promotions.kind,
      title: promotions.title,
      subtitle: promotions.subtitle,
      ctaLabel: promotions.ctaLabel,
      productId: promotions.productId,
      serviceName: products.serviceName,
      planName: products.planName,
      marketCode: promotions.marketCode,
      sortOrder: promotions.sortOrder,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      isActive: promotions.isActive,
      createdAt: promotions.createdAt,
    })
    .from(promotions)
    .leftJoin(products, eq(products.id, promotions.productId))
    .orderBy(
      asc(promotions.kind),
      asc(promotions.sortOrder),
      desc(promotions.createdAt),
    );
  return rows.map((row) => ({
    ...row,
    productLabel: row.serviceName ? `${row.serviceName} — ${row.planName}` : null,
  }));
}

export async function getPromotableProducts() {
  return db
    .select({
      id: products.id,
      serviceName: products.serviceName,
      planName: products.planName,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.serviceName), asc(products.planName));
}
