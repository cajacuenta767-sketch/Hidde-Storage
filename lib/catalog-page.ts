import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import { cache } from 'react';

import { db } from '@/db/client';
import {
  accessTypes,
  categories,
  durations,
  offerVariants,
  products,
} from '@/db/schema';

export type ProductPageOffer = {
  accessTypeName: string;
  durationLabel: string;
  durationMonths: number;
  marketCode: 'PE' | 'BO';
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  warrantyDays: number;
  inStock: boolean;
};

export type ProductPageData = {
  slug: string;
  serviceName: string;
  planName: string;
  category: string;
  description: string;
  deliveryLabel: string;
  accent: string;
  accentSoft: string;
  imagePath: string;
  imageAlt: string;
  offers: ProductPageOffer[];
};

export const getProductPage = cache(
  async (slug: string): Promise<ProductPageData | null> => {
    const [product] = await db
      .select({
        id: products.id,
        slug: products.slug,
        serviceName: products.serviceName,
        planName: products.planName,
        category: categories.name,
        description: products.description,
        deliveryLabel: products.deliveryLabel,
        accent: products.accentColor,
        accentSoft: products.accentSoftColor,
        imagePath: products.imagePath,
        imageAlt: products.imageAlt,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);
    if (!product) return null;

    const offerRows = await db
      .select({
        accessTypeName: accessTypes.name,
        durationLabel: durations.label,
        durationMonths: offerVariants.durationMonths,
        marketCode: offerVariants.marketCode,
        amountMinor: offerVariants.amountMinor,
        compareAtAmountMinor: offerVariants.compareAtAmountMinor,
        discountBasisPoints: offerVariants.discountBasisPoints,
        warrantyDays: offerVariants.warrantyDays,
        stock: offerVariants.stock,
      })
      .from(offerVariants)
      .innerJoin(accessTypes, eq(accessTypes.code, offerVariants.accessTypeCode))
      .innerJoin(durations, eq(durations.months, offerVariants.durationMonths))
      .where(
        and(
          eq(offerVariants.productId, product.id),
          eq(offerVariants.isActive, true),
          eq(offerVariants.accessTypeCode, 'PROFILE'),
        ),
      )
      .orderBy(asc(offerVariants.marketCode), asc(durations.sortOrder));

    const offers: ProductPageOffer[] = [];
    for (const row of offerRows) {
      if (row.amountMinor === null) continue;
      if (row.marketCode !== 'PE' && row.marketCode !== 'BO') continue;
      offers.push({
        accessTypeName: row.accessTypeName,
        durationLabel: row.durationLabel,
        durationMonths: row.durationMonths,
        marketCode: row.marketCode,
        price: row.amountMinor / 100,
        compareAtPrice:
          row.compareAtAmountMinor === null
            ? null
            : row.compareAtAmountMinor / 100,
        discountPercent: Math.round(row.discountBasisPoints / 100),
        warrantyDays: row.warrantyDays,
        inStock: row.stock > 0,
      });
    }

    return { ...product, offers };
  },
);

export async function getIndexableProductSlugs() {
  const rows = await db
    .selectDistinct({ slug: products.slug })
    .from(products)
    .innerJoin(offerVariants, eq(offerVariants.productId, products.id))
    .where(
      and(
        eq(products.isActive, true),
        eq(offerVariants.isActive, true),
        eq(offerVariants.accessTypeCode, 'PROFILE'),
      ),
    )
    .orderBy(asc(products.slug));
  return rows.map((row) => row.slug);
}
