import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { cache } from 'react';

import { db } from '@/db/client';
import {
  accessTypes,
  categories,
  durations,
  offerVariants,
  products,
} from '@/db/schema';
import type {
  AccessTypeCode,
  CatalogData,
  CatalogOffer,
  CatalogPlan,
  CatalogProduct,
  MarketCode,
} from '@/lib/catalog-types';

export const getCatalog = cache(async (): Promise<CatalogData> => {
  const [categoryRows, productRows, offerRows] = await Promise.all([
    db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select({
        slug: products.slug,
        productId: products.id,
        service: products.serviceName,
        plan: products.planName,
        category: categories.name,
        description: products.description,
        seller: products.sellerLabel,
        delivery: products.deliveryLabel,
        accent: products.accentColor,
        accentSoft: products.accentSoftColor,
        artClass: products.artworkClass,
        mark: products.mark,
        imagePath: products.imagePath,
        imageAlt: products.imageAlt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isActive, true))
      .orderBy(
        asc(categories.sortOrder),
        asc(products.serviceName),
        asc(products.sortOrder),
        asc(products.planName),
      ),
    db
      .select({
        id: offerVariants.id,
        productId: offerVariants.productId,
        accessTypeCode: offerVariants.accessTypeCode,
        accessTypeName: accessTypes.name,
        accessTypeDescription: accessTypes.description,
        durationMonths: offerVariants.durationMonths,
        durationLabel: durations.label,
        marketCode: offerVariants.marketCode,
        amountMinor: offerVariants.amountMinor,
        compareAtAmountMinor: offerVariants.compareAtAmountMinor,
        sourceCurrency: offerVariants.sourceCurrency,
        sourceAmountMinor: offerVariants.sourceAmountMinor,
        exchangeRate: offerVariants.exchangeRate,
        discountBasisPoints: offerVariants.discountBasisPoints,
        pricingSource: offerVariants.pricingSource,
        stock: offerVariants.stock,
        delivery: offerVariants.deliveryLabel,
        warrantyDays: offerVariants.warrantyDays,
      })
      .from(offerVariants)
      .innerJoin(
        accessTypes,
        eq(offerVariants.accessTypeCode, accessTypes.code),
      )
      .innerJoin(durations, eq(offerVariants.durationMonths, durations.months))
      .where(eq(offerVariants.isActive, true))
      .orderBy(
        asc(accessTypes.sortOrder),
        asc(durations.sortOrder),
        asc(offerVariants.marketCode),
      ),
  ]);

  const offersByProduct = new Map<number, CatalogOffer[]>();

  for (const row of offerRows) {
    if (row.marketCode !== 'PE' && row.marketCode !== 'BO') continue;
    if (
      row.accessTypeCode !== 'PROFILE' &&
      row.accessTypeCode !== 'FULL_ACCOUNT'
    )
      continue;

    const productOffers = offersByProduct.get(row.productId) ?? [];
    productOffers.push({
      id: row.id,
      accessTypeCode: row.accessTypeCode as AccessTypeCode,
      accessTypeName: row.accessTypeName,
      accessTypeDescription: row.accessTypeDescription,
      durationMonths: row.durationMonths,
      durationLabel: row.durationLabel,
      marketCode: row.marketCode as MarketCode,
      price: row.amountMinor === null ? null : row.amountMinor / 100,
      compareAtPrice:
        row.compareAtAmountMinor === null
          ? null
          : row.compareAtAmountMinor / 100,
      sourceCurrency:
        row.sourceCurrency === 'PEN' || row.sourceCurrency === 'USD'
          ? row.sourceCurrency
          : null,
      sourceMonthlyPrice:
        row.sourceAmountMinor === null ? null : row.sourceAmountMinor / 100,
      exchangeRate: row.exchangeRate === null ? null : Number(row.exchangeRate),
      discountPercent: row.discountBasisPoints / 100,
      pricingSource: row.pricingSource,
      stock: row.stock,
      delivery: row.delivery,
      warrantyDays: row.warrantyDays,
    });
    offersByProduct.set(row.productId, productOffers);
  }

  const services = new Map<string, CatalogProduct>();

  for (const row of productRows) {
    const plan: CatalogPlan = {
      id: row.productId,
      slug: row.slug,
      name: row.plan,
      offers: offersByProduct.get(row.productId) ?? [],
    };
    const current = services.get(row.service);

    if (current) {
      current.plans.push(plan);
      current.plan = `${current.plans.length} planes disponibles`;
      continue;
    }

    services.set(row.service, {
      id: row.slug,
      service: row.service,
      plan: row.plan,
      plans: [plan],
      category: row.category,
      prices: { PE: null, BO: null },
      cadence: 'desde',
      seller: row.seller,
      delivery: row.delivery,
      accent: row.accent,
      accentSoft: row.accentSoft,
      artClass: row.artClass,
      mark: row.mark,
      imagePath:
        row.service === 'Disney+'
          ? '/platforms/disney-wordmark.png'
          : row.service === 'Crunchyroll'
            ? '/platforms/crunchyroll-wordmark.png'
            : row.imagePath,
      imageAlt: row.imageAlt,
      note: row.description,
      maxDiscountPercent: 0,
    });
  }

  const serviceRows = Array.from(services.values());

  for (const service of serviceRows) {
    service.maxDiscountPercent = Math.max(
      0,
      ...service.plans.flatMap((plan) =>
        plan.offers
          .filter((offer) => offer.price !== null)
          .map((offer) => offer.discountPercent),
      ),
    );
    for (const marketCode of ['PE', 'BO'] as const) {
      const prices = service.plans
        .flatMap((plan) => plan.offers)
        .filter(
          (offer) => offer.marketCode === marketCode && offer.price !== null,
        )
        .map((offer) => offer.price as number);
      service.prices[marketCode] =
        prices.length > 0 ? Math.min(...prices) : null;
    }
  }

  return {
    categories: [
      'Todo',
      ...categoryRows
        .map((category) => category.name)
        .filter((name) =>
          serviceRows.some((service) => service.category === name),
        ),
    ],
    products: serviceRows,
  };
});
