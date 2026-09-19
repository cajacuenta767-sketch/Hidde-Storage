'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowRight,
  BadgePercent,
  BellRing,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Heart,
  KeyRound,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';

import { requestStockAlertAction } from '@/app/actions/stock-requests';
import { AnnouncementBar } from '@/components/marketplace/announcement-bar';
import { PromoBanners } from '@/components/marketplace/promo-banners';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import type {
  AccessTypeCode,
  CatalogOffer,
  CatalogPlan,
  CatalogProduct,
  MarketCode,
  PromotionsData,
} from '@/lib/catalog-types';

type MarketplaceProps = {
  categories: string[];
  products: CatalogProduct[];
  promotions: PromotionsData;
  viewer: {
    firstName: string;
    initials: string;
    role: 'customer' | 'admin';
  } | null;
};

type PlatformCarouselProps = {
  platforms: CatalogProduct[];
  onSelect: (platform: CatalogProduct) => void;
};

type CartItem = {
  key: string;
  product: CatalogProduct;
  plan: CatalogPlan;
  offer: CatalogOffer;
};

type MarketplaceStorage = {
  version: 1;
  marketCode: MarketCode;
  activeCategory: string;
  query: string;
  favorites: string[];
  cart: Array<{ offerId: number }>;
};

type CheckoutOrder = {
  orderId: string;
  mode: 'whatsapp';
  status: string;
  amountMinor: number;
  currency: 'PEN' | 'BOB';
  expiresAt: string;
};

const marketplaceStorageKey = 'dorapass:marketplace:v1';
const catalogPageSize = 8;

const marketOptions: Record<
  MarketCode,
  { label: string; locale: string; currency: string }
> = {
  PE: { label: 'Perú', locale: 'es-PE', currency: 'PEN' },
  BO: { label: 'Bolivia', locale: 'es-BO', currency: 'BOB' },
};

const plainNumber = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const exchangeNumber = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function formatSourceMoney(amount: number, currency: 'PEN' | 'USD') {
  return `${currency === 'USD' ? 'US$' : 'S/'}${plainNumber.format(amount)}`;
}

function getExchangeDescription(offer: CatalogOffer) {
  if (offer.exchangeRate === null || offer.sourceCurrency === null) return null;
  if (offer.sourceCurrency === 'PEN' && offer.marketCode === 'PE') return null;

  const sourceSymbol = offer.sourceCurrency === 'USD' ? 'US$1' : 'S/1';
  const targetSymbol = offer.marketCode === 'PE' ? 'S/' : 'Bs';
  return `${sourceSymbol} = ${targetSymbol}${exchangeNumber.format(offer.exchangeRate)}`;
}

const internationalPlatformPriority = [
  'Netflix',
  'YouTube Music Premium',
  'Spotify Premium',
  'Disney+',
  'Amazon Prime Video',
  'Max',
  'Apple TV+',
  'ChatGPT',
  'Google AI Pro / Gemini',
  'Microsoft 365',
  'Canva',
  'Apple Music',
  'Amazon Music Unlimited',
  'PlayStation Plus',
  'Xbox Game Pass',
  'Nintendo Switch Online',
  'Crunchyroll',
  'Paramount+',
  'Claude',
  'Perplexity',
  'Adobe Creative Cloud',
  'Google One',
  'iCloud+',
  'Duolingo',
  'NordVPN',
  'Discord Nitro',
  'Roblox Premium / Robux',
  'Fortnite / V-Bucks',
] as const;

function ProductArtwork({
  product,
  eager = false,
}: {
  product: CatalogProduct;
  eager?: boolean;
}) {
  const artStyle = {
    '--art-accent': product.accent,
    '--art-accent-soft': product.accentSoft,
    backgroundColor: product.accent,
  } as CSSProperties;

  return (
    <div className={`product-art ${product.artClass}`} style={artStyle}>
      <Image
        className="platform-logo"
        src={product.imagePath}
        alt={product.imageAlt}
        width={512}
        height={320}
        loading={eager ? 'eager' : 'lazy'}
        sizes="(max-width: 640px) 82vw, (max-width: 1100px) 38vw, 280px"
      />
      <Image
        className="dorapass-watermark"
        src="/brand/dorapass/dorapass-logo-primary.png"
        alt=""
        aria-hidden="true"
        width={90}
        height={60}
      />
    </div>
  );
}

function PlatformCarousel({ platforms, onSelect }: PlatformCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  function moveCarousel(direction: -1 | 1) {
    const carousel = carouselRef.current;
    if (!carousel) return;

    carousel.scrollBy({
      left: direction * Math.max(320, carousel.clientWidth * 0.82),
      behavior: 'smooth',
    });
  }

  return (
    <div className="platform-carousel-shell">
      <button
        className="platform-carousel__control"
        type="button"
        onClick={() => moveCarousel(-1)}
        aria-label="Ver plataformas anteriores"
      >
        <ChevronLeft />
      </button>

      <div
        className="platform-carousel"
        ref={carouselRef}
        aria-label="Todas las plataformas disponibles"
      >
        <div className="platform-carousel__track">
          {platforms.map((platform, platformIndex) => (
            <button
              className="platform-carousel__item"
              type="button"
              onClick={() => onSelect(platform)}
              aria-label={`Ver planes de ${platform.service}`}
              key={platform.service}
            >
              <Image
                src={platform.imagePath}
                alt={platform.imageAlt}
                fill
                loading={platformIndex < 10 ? 'eager' : 'lazy'}
                sizes="(max-width: 720px) 120px, 156px"
              />
            </button>
          ))}
        </div>
      </div>

      <button
        className="platform-carousel__control"
        type="button"
        onClick={() => moveCarousel(1)}
        aria-label="Ver más plataformas"
      >
        <ChevronRight />
      </button>
    </div>
  );
}

export function Marketplace({
  categories,
  products,
  promotions,
  viewer,
}: MarketplaceProps) {
  const [marketCode, setMarketCode] = useState<MarketCode>('BO');
  const [activeCategory, setActiveCategory] = useState('Todo');
  const [query, setQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    null,
  );
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedAccessType, setSelectedAccessType] =
    useState<AccessTypeCode>('PROFILE');
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [catalogPagination, setCatalogPagination] = useState({
    key: '',
    count: catalogPageSize,
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [stockAlert, setStockAlert] = useState<{
    offerId: number;
    status: 'sending' | 'success' | 'error';
    message: string;
  } | null>(null);
  const [activeOrder, setActiveOrder] = useState<CheckoutOrder | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const restorePreferences = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(marketplaceStorageKey);
        if (!raw) return;

        const saved = JSON.parse(raw) as Partial<MarketplaceStorage>;
        if (saved.version !== 1) return;

        const restoredMarket =
          saved.marketCode === 'PE' || saved.marketCode === 'BO'
            ? saved.marketCode
            : 'BO';
        setMarketCode(restoredMarket);
        setActiveCategory(
          typeof saved.activeCategory === 'string' &&
            categories.includes(saved.activeCategory)
            ? saved.activeCategory
            : 'Todo',
        );
        setQuery(
          typeof saved.query === 'string' ? saved.query.slice(0, 120) : '',
        );
        setFavorites(
          Array.isArray(saved.favorites)
            ? saved.favorites.filter(
                (id): id is string =>
                  typeof id === 'string' &&
                  products.some((product) => product.id === id),
              )
            : [],
        );

        const restoredCart: CartItem[] = [];
        for (const storedItem of Array.isArray(saved.cart) ? saved.cart : []) {
          if (!storedItem || typeof storedItem.offerId !== 'number') {
            continue;
          }

          let restored: CartItem | null = null;
          for (const product of products) {
            for (const plan of product.plans) {
              const offer = plan.offers.find(
                (candidate) => candidate.id === storedItem.offerId,
              );
              if (!offer) continue;

              if (offer.price === null || offer.stock <= 0) {
                continue;
              }

              restored = {
                key: String(offer.id),
                product,
                plan,
                offer,
              };
            }
          }
          if (restored && restored.offer.marketCode === restoredMarket) {
            restoredCart.push(restored);
          }
        }

        setCartItems(restoredCart);
      } catch {
        // Ignore damaged browser preferences and continue with safe defaults.
      } finally {
        setPreferencesReady(true);
      }
    }, 0);

    return () => window.clearTimeout(restorePreferences);
  }, [categories, products]);

  useEffect(() => {
    if (!preferencesReady) return;
    const saved: MarketplaceStorage = {
      version: 1,
      marketCode,
      activeCategory,
      query,
      favorites,
      cart: cartItems.map((item) => ({
        offerId: item.offer.id,
      })),
    };
    try {
      window.localStorage.setItem(marketplaceStorageKey, JSON.stringify(saved));
    } catch {
      // Private browsing or storage quotas must not block shopping.
    }
  }, [
    activeCategory,
    cartItems,
    favorites,
    marketCode,
    preferencesReady,
    query,
  ]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(marketOptions[marketCode].locale, {
        style: 'currency',
        currency: marketOptions[marketCode].currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [marketCode],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'Todo' || product.category === activeCategory;
      const matchesSelectedService =
        selectedService === null || product.service === selectedService;
      const matchesQuery =
        !normalizedQuery ||
        `${product.service} ${product.plans.map((plan) => plan.name).join(' ')} ${product.category} ${product.note}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesSelectedService && matchesQuery;
    });
  }, [activeCategory, deferredQuery, products, selectedService]);

  const catalogFilterKey = `${marketCode}:${activeCategory}:${deferredQuery}:${selectedService ?? ''}`;
  const visibleProductCount =
    catalogPagination.key === catalogFilterKey
      ? catalogPagination.count
      : catalogPageSize;

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleProductCount),
    [filteredProducts, visibleProductCount],
  );

  const carouselPlatforms = useMemo(() => {
    const platformsByService = new Map<string, CatalogProduct>();

    for (const product of products) {
      if (!platformsByService.has(product.service)) {
        platformsByService.set(product.service, product);
      }
    }

    const prioritizedPlatforms = internationalPlatformPriority
      .map((service) => platformsByService.get(service))
      .filter((platform): platform is CatalogProduct => Boolean(platform));
    const priorityServices = new Set<string>(internationalPlatformPriority);
    const remainingPlatforms = Array.from(platformsByService.values()).filter(
      (platform) => !priorityServices.has(platform.service),
    );

    return [...prioritizedPlatforms, ...remainingPlatforms].slice(0, 12);
  }, [products]);

  const selectedPlan = useMemo(
    () =>
      selectedProduct?.plans.find((plan) => plan.id === selectedPlanId) ??
      selectedProduct?.plans[0] ??
      null,
    [selectedPlanId, selectedProduct],
  );

  const selectedOffer = useMemo(
    () =>
      selectedPlan?.offers.find(
        (offer) =>
          offer.accessTypeCode === selectedAccessType &&
          offer.durationMonths === selectedDuration &&
          offer.marketCode === marketCode,
      ) ?? null,
    [marketCode, selectedAccessType, selectedDuration, selectedPlan],
  );

  const availableAccessTypes = useMemo(() => {
    const options = new Map<
      AccessTypeCode,
      { code: AccessTypeCode; name: string; description: string }
    >();
    for (const offer of selectedPlan?.offers ?? []) {
      if (!options.has(offer.accessTypeCode)) {
        options.set(offer.accessTypeCode, {
          code: offer.accessTypeCode,
          name: offer.accessTypeName,
          description: offer.accessTypeDescription,
        });
      }
    }
    return Array.from(options.values());
  }, [selectedPlan]);

  const availableDurations = useMemo(() => {
    const options = new Map<
      number,
      { label: string; discountPercent: number }
    >();
    for (const offer of selectedPlan?.offers ?? []) {
      if (
        offer.accessTypeCode === selectedAccessType &&
        offer.marketCode === marketCode &&
        !options.has(offer.durationMonths)
      ) {
        options.set(offer.durationMonths, {
          label: offer.durationLabel,
          discountPercent: offer.discountPercent,
        });
      }
    }
    return Array.from(options, ([months, option]) => ({
      months,
      ...option,
    })).sort((left, right) => left.months - right.months);
  }, [marketCode, selectedAccessType, selectedPlan]);

  const selectedPrice = selectedOffer?.price ?? null;
  const selectedRegularPrice = selectedOffer?.compareAtPrice ?? selectedPrice;
  const selectedDiscountAmount =
    selectedPrice !== null && selectedRegularPrice !== null
      ? Math.max(0, selectedRegularPrice - selectedPrice)
      : null;
  const selectedExchangeDescription = selectedOffer
    ? getExchangeDescription(selectedOffer)
    : null;
  const canAddSelectedOffer =
    selectedOffer !== null && selectedPrice !== null && selectedOffer.stock > 0;
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + (item.offer.price ?? 0),
    0,
  );
  const selectedDirectAction = 'Comprar por WhatsApp';

  function openProduct(product: CatalogProduct) {
    setSelectedProduct(product);
    setSelectedPlanId(product.plans[0]?.id ?? null);
    setSelectedAccessType('PROFILE');
    setSelectedDuration(1);
  }

  function addSelectedToCart() {
    if (
      !selectedProduct ||
      !selectedPlan ||
      !selectedOffer ||
      !canAddSelectedOffer
    ) {
      return;
    }

    const key = String(selectedOffer.id);
    setCartItems((current) =>
      current.some((item) => item.key === key)
        ? current
        : [
            ...current,
            {
              key,
              product: selectedProduct,
              plan: selectedPlan,
              offer: selectedOffer,
            },
          ],
    );
    setSelectedProduct(null);
    setIsCartOpen(true);
  }

  function removeFromCart(itemKey: string) {
    setCartItems((current) => current.filter((item) => item.key !== itemKey));
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  async function createOrder(items: CartItem[]) {
    if (!viewer) {
      window.location.assign('/ingresar?next=/');
      return null;
    }

    setIsCheckingOut(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerVariantIds: items.map((item) => item.offer.id),
          marketCode,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CheckoutOrder & { error?: string })
        | null;
      if (!response.ok || !payload?.orderId) {
        throw new Error(payload?.error ?? 'No pudimos crear el pedido.');
      }

      setActiveOrder(payload);
      setSelectedProduct(null);
      window.location.assign(`/pedido/${payload.orderId}`);
      return payload;
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : 'No pudimos crear el pedido.',
      );
      return null;
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function handleCheckout() {
    if (cartItems.length === 0) return;
    await createOrder(cartItems);
  }

  async function requestStockAlert() {
    if (!selectedOffer || selectedOffer.stock > 0) return;
    if (!viewer) {
      window.location.assign('/ingresar?next=/');
      return;
    }
    const offerId = selectedOffer.id;
    setStockAlert({ offerId, status: 'sending', message: '' });
    try {
      const result = await requestStockAlertAction(offerId);
      if (result.status === 'unauthenticated') {
        window.location.assign('/ingresar?next=/');
        return;
      }
      setStockAlert({
        offerId,
        status: result.status === 'success' ? 'success' : 'error',
        message:
          result.message ??
          (result.status === 'success'
            ? 'Te avisaremos cuando vuelva el stock.'
            : 'No pudimos registrar tu solicitud.'),
      });
    } catch {
      setStockAlert({
        offerId,
        status: 'error',
        message: 'No pudimos registrar tu solicitud. Inténtalo de nuevo.',
      });
    }
  }

  async function paySelectedNow() {
    if (
      !selectedProduct ||
      !selectedPlan ||
      !selectedOffer ||
      !canAddSelectedOffer
    ) {
      return;
    }
    const item: CartItem = {
      key: String(selectedOffer.id),
      product: selectedProduct,
      plan: selectedPlan,
      offer: selectedOffer,
    };
    await createOrder([item]);
  }

  function resetCart() {
    setIsCartOpen(false);
    setCartItems([]);
    setActiveOrder(null);
    setCheckoutError('');
  }

  function changeMarket(nextMarket: MarketCode) {
    setMarketCode(nextMarket);
    setCartItems([]);
  }

  function selectCarouselPlatform(platform: CatalogProduct) {
    openProduct(platform);
  }

  function selectPromotedProduct(productId: number) {
    const product = products.find((candidate) =>
      candidate.plans.some((plan) => plan.id === productId),
    );
    if (product) openProduct(product);
  }

  return (
    <main className="marketplace-app marketplace-app--compact">
      <AnnouncementBar
        announcements={promotions.announcements}
        marketCode={marketCode}
      />
      <header className="site-header">
        <div className="shell header-inner">
          <a
            className="brand"
            href="#top"
            aria-label="DoraPass, inicio"
            onClick={(event) => {
              event.preventDefault();
              setIsMobileNavOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-name">DoraPass</span>
          </a>

          <nav
            id="mobile-navigation"
            className={`main-nav ${isMobileNavOpen ? 'main-nav-open' : ''}`}
            aria-label="Navegación principal"
          >
            <button
              className="nav-link nav-link-active"
              type="button"
              onClick={() => {
                setIsMobileNavOpen(false);
                document
                  .getElementById('top')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explorar
            </button>
            <Link
              className="nav-link"
              href={
                viewer?.role === 'admin'
                  ? '/admin'
                  : viewer
                    ? '/mi-cuenta/suscripciones'
                    : '/ingresar?next=/mi-cuenta/suscripciones'
              }
              onClick={() => setIsMobileNavOpen(false)}
            >
              {viewer?.role === 'admin'
                ? 'Panel administrador'
                : 'Mis suscripciones'}
            </Link>
          </nav>

          <div className="header-actions">
            <button
              className="mobile-nav-toggle"
              type="button"
              aria-label={isMobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMobileNavOpen((current) => !current)}
            >
              {isMobileNavOpen ? <X /> : <Menu />}
            </button>
            <Button
              className="cart-trigger"
              type="button"
              variant="ghost"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Abrir carrito con ${cartItems.length} artículos`}
            >
              <ShoppingBag />
              <span>Carrito</span>
              <span className="cart-count">{cartItems.length}</span>
            </Button>
            {viewer ? (
              <Link
                className="profile-button"
                href={viewer.role === 'admin' ? '/admin' : '/mi-cuenta'}
                aria-label={
                  viewer.role === 'admin'
                    ? 'Abrir panel administrador'
                    : `Abrir cuenta de ${viewer.firstName}`
                }
              >
                <span>{viewer.initials}</span>
              </Link>
            ) : (
              <Link className="login-trigger" href="/ingresar">
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="shell marketplace-content" id="top">
        <section className="hero-block" aria-labelledby="main-title">
          <div className="hero-copy">
            <h1 id="main-title">Todas tus plataformas, en un solo lugar.</h1>
          </div>

          <PromoBanners
            banners={promotions.banners}
            marketCode={marketCode}
            onSelect={selectPromotedProduct}
          />

          <PlatformCarousel
            platforms={carouselPlatforms}
            onSelect={selectCarouselPlatform}
          />

          <div
            className="hero-benefits"
            aria-label="Beneficios de comprar en DoraPass"
          >
            <div className="hero-benefit">
              <span className="hero-benefit__icon">
                <ShieldCheck />
              </span>
              <strong>
                <span className="benefit-label benefit-label--full">
                  Compra rápida y segura
                </span>
                <span className="benefit-label benefit-label--short">
                  Compra segura
                </span>
              </strong>
            </div>
            <div className="hero-benefit">
              <span className="hero-benefit__icon">
                <CalendarCheck2 />
              </span>
              <strong>
                <span className="benefit-label benefit-label--full">
                  Garantía durante todos los días del plan contratado
                </span>
                <span className="benefit-label benefit-label--short">
                  Garantía todo el plan
                </span>
              </strong>
            </div>
          </div>
        </section>

        <section
          className="search-panel"
          aria-label="Buscar y filtrar el catálogo"
        >
          <div className="search-box">
            <Search aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => {
                setSelectedService(null);
                setQuery(event.target.value);
              }}
              placeholder="Buscar una plataforma o plan"
              aria-label="Buscar una plataforma o plan"
            />
            {query ? (
              <button
                className="search-clear"
                type="button"
                onClick={() => {
                  setSelectedService(null);
                  setQuery('');
                }}
                aria-label="Limpiar búsqueda"
              >
                <X />
              </button>
            ) : null}
          </div>

          <div className="category-list" aria-label="Categorías principales">
            {categories.slice(0, 6).map((category) => (
              <Button
                key={category}
                className={`category-button ${activeCategory === category ? 'category-button-active' : ''}`}
                type="button"
                variant="ghost"
                aria-pressed={activeCategory === category}
                onClick={() => {
                  setSelectedService(null);
                  setActiveCategory(category);
                }}
              >
                {category}
              </Button>
            ))}
          </div>

          <Button
            className="filter-button catalog-filter-trigger"
            type="button"
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
          >
            <SlidersHorizontal />
            <span className="filter-label filter-label--desktop">
              Más filtros
            </span>
            <span className="filter-label filter-label--mobile">
              Categorías
            </span>
          </Button>

          <div className="market-switch" aria-label="País del catálogo">
            {(Object.keys(marketOptions) as MarketCode[]).map((code) => (
              <Button
                key={code}
                className={`market-button ${marketCode === code ? 'market-button-active' : ''}`}
                type="button"
                variant="outline"
                aria-pressed={marketCode === code}
                onClick={() => changeMarket(code)}
              >
                {marketOptions[code].label}
              </Button>
            ))}
          </div>
        </section>

        <section
          className="catalog-section"
          id="catalog"
          aria-labelledby="catalog-title"
        >
          <div className="catalog-heading">
            <div>
              <h2 id="catalog-title">Todos los servicios</h2>
            </div>
            <span className="catalog-status">
              <span className="status-dot" />
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'resultado' : 'resultados'} ·{' '}
              {marketOptions[marketCode].label}
            </span>
          </div>

          {filteredProducts.length > 0 ? (
            <>
              <div className="product-grid">
                {visibleProducts.map((product, index) => {
                  const isFavorite = favorites.includes(product.id);
                  const productPrice = product.prices[marketCode];
                  const planLabel =
                    product.plans.length === 1
                      ? product.plans[0]?.name
                      : `${product.plans.length} planes disponibles`;

                  return (
                    <article className="product-card" key={product.id}>
                      <div className="product-card__visual-wrap">
                        <button
                          className="product-card__visual-button"
                          type="button"
                          onClick={() => openProduct(product)}
                          aria-label={`Configurar ${product.service}`}
                        >
                          <ProductArtwork product={product} eager={index < 4} />
                        </button>
                        <button
                          className={`favorite-button ${isFavorite ? 'favorite-button-active' : ''}`}
                          type="button"
                          onClick={() => toggleFavorite(product.id)}
                          aria-label={
                            isFavorite
                              ? `Quitar ${product.service} de favoritos`
                              : `Guardar ${product.service} en favoritos`
                          }
                          aria-pressed={isFavorite}
                        >
                          <Heart fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        {product.maxDiscountPercent >= 5 ? (
                          <span className="discount-flag">
                            -{Math.round(product.maxDiscountPercent)}%
                          </span>
                        ) : null}
                        <Badge className="verified-badge">
                          <ShieldCheck /> Verificado
                        </Badge>
                      </div>
                      <div className="product-card__body">
                        <button
                          className="product-card__title"
                          type="button"
                          onClick={() => openProduct(product)}
                        >
                          <span>
                            {product.service} <em>· {planLabel}</em>
                          </span>
                          <ArrowRight />
                        </button>
                        <div className="product-card__bottom">
                          <span className="product-price">
                            {productPrice === null ? (
                              'Precio por confirmar'
                            ) : (
                              <>
                                {money.format(productPrice)}{' '}
                                <small>{product.cadence}</small>
                              </>
                            )}
                          </span>
                          <Button
                            className="add-button"
                            type="button"
                            onClick={() => openProduct(product)}
                          >
                            <ArrowRight />
                            Configurar
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {visibleProducts.length < filteredProducts.length ? (
                <div className="catalog-load-more">
                  <Button
                    className="catalog-load-more__button"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCatalogPagination({
                        key: catalogFilterKey,
                        count: visibleProductCount + catalogPageSize,
                      })
                    }
                  >
                    Ver más servicios
                    <Plus />
                  </Button>
                  <span>
                    Mostrando {visibleProducts.length} de{' '}
                    {filteredProducts.length}
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state__icon">
                <Search />
              </span>
              <h3>No encontramos ese plan.</h3>
              <p>Prueba con otra palabra o vuelve a ver todo el catálogo.</p>
              <Button
                className="dark-button"
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCategory('Todo');
                }}
              >
                Ver todo el catálogo
              </Button>
            </div>
          )}
        </section>
      </div>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <span>
            DoraPass <small>· Tu streaming, a tu ritmo.</small>
          </span>
          <span className="footer-safe">
            <CircleHelp /> No mostramos contraseñas ni credenciales.
          </span>
        </div>
      </footer>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent
          className="market-sheet catalog-filter-sheet"
          side="right"
        >
          <SheetHeader className="market-sheet__header">
            <SheetTitle>Categorías</SheetTitle>
            <SheetDescription>
              Elige qué tipo de servicio quieres explorar.
            </SheetDescription>
          </SheetHeader>
          <div
            className="catalog-filter-sheet__options"
            aria-label="Todas las categorías"
          >
            {categories.map((category) => (
              <button
                className={`catalog-filter-option ${activeCategory === category ? 'catalog-filter-option--active' : ''}`}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => {
                  setSelectedService(null);
                  setActiveCategory(category);
                  setIsFilterOpen(false);
                  document
                    .getElementById('catalog')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                key={category}
              >
                <span>{category}</span>
                {activeCategory === category ? <Check /> : <ChevronRight />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="market-sheet" side="right">
          {activeOrder ? (
            <div className="payment-state">
              <SheetHeader className="market-sheet__header payment-state__header">
                <Badge variant="outline">Solicitud por WhatsApp</Badge>
                <SheetTitle>Tu pedido está listo para enviarse.</SheetTitle>
                <SheetDescription>
                  Abrimos WhatsApp con el resumen completo. Envíalo para
                  coordinar directamente la compra con DoraPass.
                </SheetDescription>
              </SheetHeader>

              <div className="payment-state__body">
                <div className="payment-order-card">
                  <span>Número de pedido</span>
                  <strong>{activeOrder.orderId}</strong>
                  <div>
                    <span>Total</span>
                    <b>{money.format(activeOrder.amountMinor / 100)}</b>
                  </div>
                </div>

                <div className="payment-timeline" aria-live="polite">
                  <span className="payment-timeline__dot" />
                  <div>
                    <strong>Atención directa por WhatsApp</strong>
                    <small>
                      Sin pasarelas de pago ni formularios adicionales.
                    </small>
                  </div>
                </div>

                {checkoutError ? (
                  <p className="checkout-error" role="alert">
                    {checkoutError}
                  </p>
                ) : null}

                <div className="payment-actions">
                  <Button
                    className="whatsapp-button checkout-button"
                    type="button"
                    onClick={() =>
                      window.location.assign(`/pedido/${activeOrder.orderId}`)
                    }
                  >
                    <MessageCircle /> Continuar pedido
                  </Button>
                  <Button
                    className="dark-button checkout-button"
                    type="button"
                    onClick={resetCart}
                  >
                    Seguir explorando <ArrowRight />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <SheetHeader className="market-sheet__header">
                <div className="sheet-title-row">
                  <SheetTitle>Tu carrito</SheetTitle>
                  <Badge variant="outline">
                    {cartItems.length}{' '}
                    {cartItems.length === 1 ? 'artículo' : 'artículos'}
                  </Badge>
                </div>
                <SheetDescription>
                  Revisa tus planes antes de continuar.
                </SheetDescription>
              </SheetHeader>
              <div className="cart-body">
                {cartItems.length > 0 ? (
                  <div className="cart-list">
                    {cartItems.map((item) => (
                      <div className="cart-line" key={item.key}>
                        <div className="cart-line__swatch">
                          <Image
                            src={item.product.imagePath}
                            alt=""
                            width={44}
                            height={32}
                          />
                        </div>
                        <div className="cart-line__copy">
                          <strong>
                            {item.product.service} · {item.plan.name}
                          </strong>
                          <span>
                            {item.offer.accessTypeName} ·{' '}
                            {item.offer.durationLabel}
                          </span>
                          <b>{money.format(item.offer.price ?? 0)}</b>
                        </div>
                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          aria-label={`Quitar ${item.product.service} del carrito`}
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cart-empty">
                    <span className="cart-empty__icon">
                      <ShoppingBag />
                    </span>
                    <h3>Tu carrito está vacío.</h3>
                    <p>Añade un plan para verlo aquí.</p>
                    <Button
                      className="dark-button"
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                    >
                      Explorar planes
                    </Button>
                  </div>
                )}
              </div>
              {cartItems.length > 0 ? (
                <SheetFooter className="market-sheet__footer">
                  <div className="cart-total">
                    <span>Total estimado</span>
                    <strong>{money.format(cartTotal)}</strong>
                  </div>
                  {checkoutError ? (
                    <p className="checkout-error" role="alert">
                      {checkoutError}
                    </p>
                  ) : null}
                  <Button
                    className="lime-button checkout-button"
                    type="button"
                    disabled={isCheckingOut}
                    onClick={() => void handleCheckout()}
                  >
                    {isCheckingOut
                      ? 'Preparando resumen…'
                      : 'Enviar pedido por WhatsApp'}
                    <MessageCircle />
                  </Button>
                  <small className="sheet-footnote">
                    Te enviaremos directamente al WhatsApp de DoraPass con el
                    resumen completo.
                  </small>
                </SheetFooter>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <SheetContent className="market-sheet detail-sheet" side="right">
          {selectedProduct && selectedPlan && selectedOffer ? (
            <>
              <div className="detail-art-wrap">
                <ProductArtwork product={selectedProduct} eager />
              </div>
              <SheetHeader className="market-sheet__header detail-header">
                <Badge className="detail-badge">
                  <ShieldCheck /> Publicación verificada
                </Badge>
                <SheetTitle>{selectedProduct.service}</SheetTitle>
                <SheetDescription>
                  {selectedProduct.note} Configura el acceso que necesitas y
                  consulta el precio para {marketOptions[marketCode].label}.
                </SheetDescription>
              </SheetHeader>

              <div className="configuration-form">
                <fieldset className="configuration-group">
                  <legend>1. Selecciona tu plan</legend>
                  <div className="configuration-options configuration-options--plans">
                    {selectedProduct.plans.map((plan) => (
                      <button
                        className={`configuration-option ${selectedPlan.id === plan.id ? 'configuration-option--active' : ''}`}
                        type="button"
                        aria-pressed={selectedPlan.id === plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        key={plan.id}
                      >
                        <strong>{plan.name}</strong>
                        <small>Plan disponible</small>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="configuration-group">
                  <legend>2. Selecciona el tipo de acceso</legend>
                  <div className="configuration-options">
                    {availableAccessTypes.map((accessType) => (
                      <button
                        className={`configuration-option configuration-option--access ${selectedAccessType === accessType.code ? 'configuration-option--active' : ''}`}
                        type="button"
                        aria-pressed={selectedAccessType === accessType.code}
                        onClick={() => setSelectedAccessType(accessType.code)}
                        key={accessType.code}
                      >
                        {accessType.code === 'PROFILE' ? (
                          <UserRound />
                        ) : (
                          <KeyRound />
                        )}
                        <span>
                          <strong>{accessType.name}</strong>
                          <small>{accessType.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="configuration-group">
                  <legend>3. Selecciona la duración</legend>
                  <div className="configuration-options configuration-options--duration">
                    {availableDurations.map((duration) => (
                      <button
                        className={`configuration-option ${selectedDuration === duration.months ? 'configuration-option--active' : ''}`}
                        type="button"
                        aria-pressed={selectedDuration === duration.months}
                        onClick={() => setSelectedDuration(duration.months)}
                        key={duration.months}
                      >
                        <strong>{duration.label}</strong>
                        {duration.discountPercent > 0 ? (
                          <small className="duration-discount">
                            −{duration.discountPercent.toFixed(2)}%
                          </small>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="configuration-group">
                  <legend>4. Selecciona el país</legend>
                  <div className="configuration-options configuration-options--country">
                    {(Object.keys(marketOptions) as MarketCode[]).map(
                      (code) => (
                        <button
                          className={`configuration-option ${marketCode === code ? 'configuration-option--active' : ''}`}
                          type="button"
                          aria-pressed={marketCode === code}
                          onClick={() => changeMarket(code)}
                          key={code}
                        >
                          <MapPin />
                          <span>
                            <strong>{marketOptions[code].label}</strong>
                            <small>{marketOptions[code].currency}</small>
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>

                <div className="selection-summary">
                  <span>Resumen de tu selección</span>
                  <strong>
                    {selectedProduct.service} · {selectedPlan.name}
                  </strong>
                  <p>
                    {selectedOffer.accessTypeName} ·{' '}
                    {selectedOffer.durationLabel} ·{' '}
                    {marketOptions[marketCode].label}
                  </p>
                  <small>
                    Entrega: {selectedOffer.delivery}. Garantía durante todo el
                    periodo contratado ({selectedOffer.durationLabel}).
                  </small>
                </div>

                {selectedPrice !== null && selectedRegularPrice !== null ? (
                  <div
                    className="price-breakdown"
                    aria-label="Detalle del precio"
                  >
                    <div className="price-breakdown__title">
                      <BadgePercent />
                      <strong>Detalle del precio</strong>
                    </div>
                    {selectedOffer.sourceCurrency &&
                    selectedOffer.sourceMonthlyPrice !== null ? (
                      <div className="price-breakdown__row">
                        <span>Tarifa mensual original</span>
                        <b>
                          {formatSourceMoney(
                            selectedOffer.sourceMonthlyPrice,
                            selectedOffer.sourceCurrency,
                          )}
                        </b>
                      </div>
                    ) : null}
                    {selectedExchangeDescription ? (
                      <div className="price-breakdown__row">
                        <span>Tipo de cambio oficial</span>
                        <b>{selectedExchangeDescription}</b>
                      </div>
                    ) : null}
                    <div className="price-breakdown__row">
                      <span>Precio normal ({selectedOffer.durationLabel})</span>
                      <b>{money.format(selectedRegularPrice)}</b>
                    </div>
                    <div className="price-breakdown__row price-breakdown__row--discount">
                      <span>
                        {selectedOffer.discountPercent > 0
                          ? `Descuento (${selectedOffer.discountPercent.toFixed(2)}%)`
                          : 'Sin descuento'}
                      </span>
                      <b>
                        {selectedOffer.discountPercent > 0
                          ? `−${money.format(selectedDiscountAmount ?? 0)}`
                          : money.format(0)}
                      </b>
                    </div>
                    <div className="price-breakdown__row price-breakdown__row--total">
                      <span>Precio final</span>
                      <b>{money.format(selectedPrice)}</b>
                    </div>
                    {selectedOffer.pricingSource ? (
                      <small>{selectedOffer.pricingSource}</small>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <SheetFooter className="market-sheet__footer detail-footer">
                <div className="detail-price-row" aria-live="polite">
                  <span>Precio</span>
                  <strong>
                    {selectedPrice === null ? (
                      'Precio por confirmar'
                    ) : (
                      <>
                        {money.format(selectedPrice)}{' '}
                        <small>por {selectedOffer.durationLabel}</small>
                      </>
                    )}
                  </strong>
                  {selectedPrice !== null && selectedDuration > 1 ? (
                    <small>
                      Equivale a{' '}
                      {money.format(selectedPrice / selectedDuration)} por mes
                    </small>
                  ) : null}
                </div>
                <Button
                  className="lime-button checkout-button"
                  type="button"
                  disabled={!canAddSelectedOffer || isCheckingOut}
                  onClick={() => void paySelectedNow()}
                >
                  {selectedPrice === null
                    ? 'Configura el precio para comprar'
                    : selectedOffer.stock <= 0
                      ? 'Sin stock disponible'
                      : isCheckingOut
                        ? 'Creando pedido…'
                        : selectedDirectAction}
                  {canAddSelectedOffer ? <MessageCircle /> : <Clock3 />}
                </Button>
                {selectedPrice !== null && selectedOffer.stock <= 0 ? (
                  stockAlert?.offerId === selectedOffer.id &&
                  stockAlert.status === 'success' ? (
                    <output className="stock-alert-success">
                      <Check /> {stockAlert.message}
                    </output>
                  ) : (
                    <>
                      <Button
                        className="dark-button checkout-button"
                        type="button"
                        disabled={
                          stockAlert?.offerId === selectedOffer.id &&
                          stockAlert.status === 'sending'
                        }
                        onClick={() => void requestStockAlert()}
                      >
                        {stockAlert?.offerId === selectedOffer.id &&
                        stockAlert.status === 'sending'
                          ? 'Enviando solicitud…'
                          : 'Avísame cuando haya stock'}
                        <BellRing />
                      </Button>
                      {stockAlert?.offerId === selectedOffer.id &&
                      stockAlert.status === 'error' ? (
                        <p className="checkout-error" role="alert">
                          {stockAlert.message}
                        </p>
                      ) : null}
                    </>
                  )
                ) : (
                  <Button
                    className="dark-button checkout-button"
                    type="button"
                    disabled={!canAddSelectedOffer}
                    onClick={addSelectedToCart}
                  >
                    <Plus />
                    Agregar al carrito
                  </Button>
                )}
                {checkoutError ? (
                  <p className="checkout-error" role="alert">
                    {checkoutError}
                  </p>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
