'use client';

import { useMemo } from 'react';

import { ProductArtwork } from '@/components/marketplace/marketplace';
import type {
  CatalogProduct,
  MarketCode,
  MarketplaceRailsData,
} from '@/lib/catalog-types';

type Rail = {
  key: string;
  title: string;
  items: CatalogProduct[];
};

function hasMarketOffer(product: CatalogProduct, marketCode: MarketCode) {
  return product.plans.some((plan) =>
    plan.offers.some(
      (offer) =>
        offer.marketCode === marketCode &&
        offer.price !== null &&
        offer.stock > 0,
    ),
  );
}

function servicesFromProductIds(
  products: CatalogProduct[],
  productIds: number[],
  marketCode: MarketCode,
) {
  const services: CatalogProduct[] = [];
  for (const productId of productIds) {
    const service = products.find((candidate) =>
      candidate.plans.some((plan) => plan.id === productId),
    );
    if (!service || services.includes(service)) continue;
    if (!hasMarketOffer(service, marketCode)) continue;
    services.push(service);
  }
  return services;
}

export function ProductRails({
  products,
  rails,
  marketCode,
  favorites,
  money,
  onSelect,
}: {
  products: CatalogProduct[];
  rails: MarketplaceRailsData;
  marketCode: MarketCode;
  favorites: string[];
  money: Intl.NumberFormat;
  onSelect: (product: CatalogProduct) => void;
}) {
  const rows = useMemo<Rail[]>(() => {
    const topOffers = products
      .filter(
        (product) =>
          product.maxDiscountPercent > 0 && hasMarketOffer(product, marketCode),
      )
      .sort((left, right) => right.maxDiscountPercent - left.maxDiscountPercent)
      .slice(0, 12);
    const favoriteServices = products.filter((product) =>
      favorites.includes(product.id),
    );
    const candidates: Rail[] = [
      { key: 'ofertas', title: '🔥 Ofertas destacadas', items: topOffers },
      {
        key: 'favoritos',
        title: '⭐ Tus favoritos',
        items: favoriteServices,
      },
      {
        key: 'vendidos',
        title: '🏆 Los más pedidos',
        items: servicesFromProductIds(
          products,
          rails.bestSellerProductIds,
          marketCode,
        ),
      },
      {
        key: 'stock',
        title: '🔄 Volvieron con stock',
        items: servicesFromProductIds(
          products,
          rails.restockedProductIds,
          marketCode,
        ),
      },
      {
        key: 'nuevos',
        title: '🆕 Nuevos en el catálogo',
        items: servicesFromProductIds(
          products,
          rails.newArrivalProductIds,
          marketCode,
        ),
      },
    ];
    return candidates.filter((rail) =>
      rail.key === 'favoritos' || rail.key === 'stock'
        ? rail.items.length >= 1
        : rail.items.length >= 4,
    );
  }, [products, rails, marketCode, favorites]);

  if (rows.length === 0) return null;

  return (
    <div className="product-rails">
      {rows.map((rail) => (
        <section
          className="product-rail"
          key={rail.key}
          aria-label={rail.title}
        >
          <h2>{rail.title}</h2>
          <div className="product-rail__track">
            {rail.items.map((product) => {
              const price = product.prices[marketCode];
              const compare = product.comparePrices[marketCode];
              return (
                <button
                  className="rail-card"
                  key={`${rail.key}-${product.id}`}
                  type="button"
                  onClick={() => onSelect(product)}
                >
                  <span className="rail-card__art">
                    {product.maxDiscountPercent >= 5 ? (
                      <span className="discount-flag discount-flag--small">
                        -{Math.round(product.maxDiscountPercent)}%
                      </span>
                    ) : null}
                    <ProductArtwork product={product} />
                  </span>
                  <span className="rail-card__name">{product.service}</span>
                  <span className="rail-card__price">
                    {price === null ? (
                      'Por confirmar'
                    ) : (
                      <>
                        {compare !== null ? (
                          <s>{money.format(compare)}</s>
                        ) : null}
                        <strong>{money.format(price)}</strong>
                        <small>desde</small>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
