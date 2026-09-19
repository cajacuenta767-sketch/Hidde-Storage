export type MarketCode = 'PE' | 'BO';
export type AccessTypeCode = 'PROFILE' | 'FULL_ACCOUNT';

export type CatalogOffer = {
  id: number;
  accessTypeCode: AccessTypeCode;
  accessTypeName: string;
  accessTypeDescription: string;
  durationMonths: number;
  durationLabel: string;
  marketCode: MarketCode;
  price: number | null;
  compareAtPrice: number | null;
  sourceCurrency: 'PEN' | 'USD' | null;
  sourceMonthlyPrice: number | null;
  exchangeRate: number | null;
  discountPercent: number;
  pricingSource: string;
  stock: number;
  delivery: string;
  warrantyDays: number;
};

export type CatalogPlan = {
  id: number;
  slug: string;
  name: string;
  offers: CatalogOffer[];
};

export type CatalogProduct = {
  id: string;
  service: string;
  plan: string;
  plans: CatalogPlan[];
  category: string;
  prices: Record<MarketCode, number | null>;
  cadence: string;
  seller: string;
  delivery: string;
  accent: string;
  accentSoft: string;
  artClass: string;
  mark: string;
  imagePath: string;
  imageAlt: string;
  note: string;
  maxDiscountPercent: number;
};

export type CatalogData = {
  categories: string[];
  products: CatalogProduct[];
};

export type PromoAnnouncement = {
  id: string;
  title: string;
  marketCode: MarketCode | null;
};

export type PromoBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  marketCode: MarketCode | null;
  productId: number | null;
  serviceName: string | null;
  planName: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  accent: string | null;
  accentSoft: string | null;
  mark: string | null;
  discountPercent: number | null;
};

export type PromotionsData = {
  announcements: PromoAnnouncement[];
  banners: PromoBanner[];
};
