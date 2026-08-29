'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Heart,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';

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

type Category = 'Todo' | 'Video' | 'Música' | 'Gaming' | 'Lectura';

type Product = {
  id: string;
  service: string;
  plan: string;
  category: Exclude<Category, 'Todo'>;
  price: number;
  cadence: string;
  seller: string;
  delivery: string;
  accent: string;
  accentSoft: string;
  artClass: string;
  mark: string;
  note: string;
};

const categories: Category[] = [
  'Todo',
  'Video',
  'Música',
  'Gaming',
  'Lectura',
];

const products: Product[] = [
  {
    id: 'cineora-premium',
    service: 'Cineora',
    plan: 'Premium',
    category: 'Video',
    price: 8.9,
    cadence: '/ mes',
    seller: 'luna digital',
    delivery: 'Entrega inmediata',
    accent: '#F46D4D',
    accentSoft: '#F9C7A3',
    artClass: 'art-cineora',
    mark: 'C',
    note: 'Películas y series en 4K',
  },
  {
    id: 'sonora-individual',
    service: 'Sonora+',
    plan: 'Individual',
    category: 'Música',
    price: 5.5,
    cadence: '/ mes',
    seller: 'bucle store',
    delivery: 'Entrega inmediata',
    accent: '#88A0FF',
    accentSoft: '#CDD7FF',
    artClass: 'art-sonora',
    mark: 'S+',
    note: 'Audio sin anuncios',
  },
  {
    id: 'playlume-cloud',
    service: 'Playlume',
    plan: 'Cloud',
    category: 'Gaming',
    price: 7.2,
    cadence: '/ mes',
    seller: 'pixel club',
    delivery: 'Entrega inmediata',
    accent: '#8A6CFF',
    accentSoft: '#D9CEFF',
    artClass: 'art-playlume',
    mark: 'P',
    note: 'Biblioteca de juegos cloud',
  },
  {
    id: 'readly-plus',
    service: 'Readly',
    plan: 'Plus',
    category: 'Lectura',
    price: 4.9,
    cadence: '/ mes',
    seller: 'página abierta',
    delivery: 'Entrega inmediata',
    accent: '#DCB442',
    accentSoft: '#F8E6A4',
    artClass: 'art-readly',
    mark: 'R',
    note: 'Revistas y lecturas ilimitadas',
  },
  {
    id: 'arcade-box',
    service: 'Arcade Box',
    plan: '1 mes',
    category: 'Gaming',
    price: 6.4,
    cadence: '',
    seller: 'next level',
    delivery: 'Entrega inmediata',
    accent: '#52B889',
    accentSoft: '#BCE8CF',
    artClass: 'art-arcade',
    mark: 'A',
    note: 'Juegos, demos y perks',
  },
  {
    id: 'mubie-cine',
    service: 'Mubié',
    plan: 'Cine',
    category: 'Video',
    price: 9.1,
    cadence: '/ mes',
    seller: 'pantalla norte',
    delivery: 'Entrega inmediata',
    accent: '#D96C9A',
    accentSoft: '#F3C8DB',
    artClass: 'art-mubie',
    mark: 'M',
    note: 'Cine de autor curado',
  },
];

const money = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function ProductArtwork({ product }: { product: Product }) {
  const artStyle = {
    '--art-accent': product.accent,
    '--art-accent-soft': product.accentSoft,
  } as CSSProperties;

  return (
    <div className={`product-art ${product.artClass}`} style={artStyle}>
      <div className="art-orbit art-orbit-one" />
      <div className="art-orbit art-orbit-two" />
      <span className="product-art__mark">{product.mark}</span>
      <span className="product-art__word">{product.service}</span>
      <span className="product-art__slash" aria-hidden="true" />
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category>('Todo');
  const [query, setQuery] = useState('');
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isPurchasesOpen, setIsPurchasesOpen] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [sellComplete, setSellComplete] = useState(false);
  const [showOnlyInstant, setShowOnlyInstant] = useState(false);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'Todo' || product.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        `${product.service} ${product.plan} ${product.category} ${product.note}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesDelivery = !showOnlyInstant || product.delivery.includes('inmediata');

      return matchesCategory && matchesQuery && matchesDelivery;
    });
  }, [activeCategory, query, showOnlyInstant]);

  const cartProducts = cartIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  const cartTotal = cartProducts.reduce((sum, product) => sum + product.price, 0);

  function addToCart(product: Product) {
    setCartIds((current) =>
      current.includes(product.id) ? current : [...current, product.id],
    );
  }

  function removeFromCart(productId: string) {
    setCartIds((current) => current.filter((id) => id !== productId));
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function handleCheckout() {
    setPurchaseComplete(true);
  }

  function resetCart() {
    setPurchaseComplete(false);
    setIsCartOpen(false);
    setCartIds([]);
  }

  return (
    <main className="marketplace-app">
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#top" aria-label="Luma Pass, inicio">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-name">luma pass</span>
          </a>

          <nav className="main-nav" aria-label="Navegación principal">
            <button className="nav-link nav-link-active" type="button">
              Explorar
            </button>
            <button
              className="nav-link"
              type="button"
              onClick={() => setIsPurchasesOpen(true)}
            >
              Mis compras
            </button>
            <button
              className="nav-link"
              type="button"
              onClick={() => setIsSellOpen(true)}
            >
              Vender
            </button>
          </nav>

          <div className="header-actions">
            <Button
              className="cart-trigger"
              type="button"
              variant="ghost"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Abrir carrito con ${cartIds.length} artículos`}
            >
              <ShoppingBag />
              <span>Carrito</span>
              <span className="cart-count">{cartIds.length}</span>
            </Button>
            <button className="profile-button" type="button" aria-label="Abrir perfil">
              <span>LM</span>
            </button>
          </div>
        </div>
      </header>

      <div className="shell marketplace-content" id="top">
        <section className="hero-block" aria-labelledby="main-title">
          <div className="hero-copy">
            <h1 id="main-title">Todo lo que quieres ver, en un solo lugar.</h1>
            <p>
              Encuentra planes digitales autorizados, compara en segundos y recibe tu
              acceso de forma inmediata.
            </p>
          </div>

          <div className="hero-side-note">
            <span className="hero-side-note__icon">
              <ShieldCheck />
            </span>
            <span>
              <strong>Compra protegida</strong>
              <small>Vendedores verificados</small>
            </span>
          </div>
        </section>

        <section className="search-panel" aria-label="Buscar y filtrar el catálogo">
          <div className="search-box">
            <Search aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una plataforma o plan"
              aria-label="Buscar una plataforma o plan"
            />
            {query ? (
              <button
                className="search-clear"
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
              >
                <X />
              </button>
            ) : null}
          </div>

          <div className="category-list" aria-label="Categorías">
            {categories.map((category) => (
              <Button
                key={category}
                className={`category-button ${activeCategory === category ? 'category-button-active' : ''}`}
                type="button"
                variant="ghost"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <Button
            className={`filter-button ${showOnlyInstant ? 'filter-button-active' : ''}`}
            type="button"
            variant="outline"
            aria-pressed={showOnlyInstant}
            onClick={() => setShowOnlyInstant((current) => !current)}
          >
            <Clock3 />
            Entrega inmediata
            <ChevronDown />
          </Button>
        </section>

        <section className="featured-offer" aria-label="Oferta destacada">
          <div className="featured-art" aria-hidden="true">
            <span className="featured-art__sun" />
            <span className="featured-art__ring" />
            <span className="featured-art__label">LP</span>
          </div>
          <div className="featured-copy">
            <span className="featured-kicker">
              <Sparkles /> Selección de la semana
            </span>
            <h2>El plan correcto para tu próxima maratón.</h2>
            <p>
              Combina entretenimiento y música con vendedores que ya pasaron nuestra
              revisión de identidad.
            </p>
          </div>
          <div className="featured-action">
            <span className="featured-price">Desde <strong>$5.50</strong></span>
            <Button
              className="dark-button"
              type="button"
              onClick={() => {
                setActiveCategory('Video');
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Ver opciones
              <ArrowRight />
            </Button>
          </div>
        </section>

        <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div>
              <p className="section-label">Catálogo curado</p>
              <h2 id="catalog-title">Suscripciones que sí encajan contigo</h2>
            </div>
            <span className="catalog-status">
              <span className="status-dot" />
              Entrega inmediata · vendedores verificados
            </span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product) => {
                const isFavorite = favorites.includes(product.id);
                const inCart = cartIds.includes(product.id);

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-card__visual-wrap">
                      <button
                        className="product-card__visual-button"
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        aria-label={`Ver detalles de ${product.service} ${product.plan}`}
                      >
                        <ProductArtwork product={product} />
                      </button>
                      <button
                        className={`favorite-button ${isFavorite ? 'favorite-button-active' : ''}`}
                        type="button"
                        onClick={() => toggleFavorite(product.id)}
                        aria-label={isFavorite ? `Quitar ${product.service} de favoritos` : `Guardar ${product.service} en favoritos`}
                        aria-pressed={isFavorite}
                      >
                        <Heart fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <Badge className="verified-badge">
                        <ShieldCheck /> Verificado
                      </Badge>
                    </div>
                    <div className="product-card__body">
                      <button
                        className="product-card__title"
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <span>
                          {product.service} <em>· {product.plan}</em>
                        </span>
                        <ArrowRight />
                      </button>
                      <p className="product-card__note">{product.note}</p>
                      <div className="product-card__meta">
                        <span className="seller-line">
                          <span className="seller-avatar">{product.seller.slice(0, 1).toUpperCase()}</span>
                          {product.seller}
                        </span>
                        <span className="delivery-line">{product.delivery}</span>
                      </div>
                      <div className="product-card__bottom">
                        <span className="product-price">
                          {money.format(product.price)} <small>{product.cadence}</small>
                        </span>
                        <Button
                          className={`add-button ${inCart ? 'add-button-added' : ''}`}
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={inCart}
                        >
                          {inCart ? <Check /> : <Plus />}
                          {inCart ? 'Añadido' : 'Añadir'}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state__icon"><Search /></span>
              <h3>No encontramos ese plan.</h3>
              <p>Prueba con otra palabra o vuelve a ver todo el catálogo.</p>
              <Button
                className="dark-button"
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCategory('Todo');
                  setShowOnlyInstant(false);
                }}
              >
                Ver todo el catálogo
              </Button>
            </div>
          )}
        </section>

        <section className="trust-strip" aria-label="Compra segura">
          <div className="trust-strip__lead">
            <span className="trust-strip__icon"><ShieldCheck /></span>
            <div>
              <strong>Compra tranquila desde el primer clic.</strong>
              <span>Revisamos cada publicación antes de mostrarla.</span>
            </div>
          </div>
          <div className="trust-points">
            <span><Check /> Planes autorizados</span>
            <span><Check /> Soporte humano</span>
            <span><Check /> Entrega clara</span>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <span>luma pass <small>· Tu streaming, a tu ritmo.</small></span>
          <span className="footer-safe"><CircleHelp /> No mostramos contraseñas ni credenciales.</span>
        </div>
      </footer>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="market-sheet" side="right">
          {purchaseComplete ? (
            <div className="success-state">
              <span className="success-icon"><Check /></span>
              <SheetTitle>Compra lista para ti.</SheetTitle>
              <SheetDescription>
                Tu acceso aparecería aquí después de confirmar el pago. Esta demo no procesa cobros reales.
              </SheetDescription>
              <div className="success-receipt">
                <span>Resumen</span>
                <strong>{cartProducts.length} {cartProducts.length === 1 ? 'plan' : 'planes'} seleccionados</strong>
                <b>{money.format(cartTotal)}</b>
              </div>
              <Button className="lime-button" type="button" onClick={resetCart}>
                Volver a explorar
                <ArrowRight />
              </Button>
            </div>
          ) : (
            <>
              <SheetHeader className="market-sheet__header">
                <div className="sheet-title-row">
                  <SheetTitle>Tu carrito</SheetTitle>
                  <Badge variant="outline">{cartProducts.length} {cartProducts.length === 1 ? 'artículo' : 'artículos'}</Badge>
                </div>
                <SheetDescription>Revisa tus planes antes de continuar.</SheetDescription>
              </SheetHeader>
              <div className="cart-body">
                {cartProducts.length > 0 ? (
                  <div className="cart-list">
                    {cartProducts.map((product) => (
                      <div className="cart-line" key={product.id}>
                        <div className={`cart-line__swatch ${product.artClass}`}>
                          <span>{product.mark}</span>
                        </div>
                        <div className="cart-line__copy">
                          <strong>{product.service} · {product.plan}</strong>
                          <span>{money.format(product.price)} {product.cadence}</span>
                        </div>
                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={`Quitar ${product.service} del carrito`}
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="cart-empty">
                    <span className="cart-empty__icon"><ShoppingBag /></span>
                    <h3>Tu carrito está vacío.</h3>
                    <p>Añade un plan para verlo aquí.</p>
                    <Button className="dark-button" type="button" onClick={() => setIsCartOpen(false)}>
                      Explorar planes
                    </Button>
                  </div>
                )}
              </div>
              {cartProducts.length > 0 ? (
                <SheetFooter className="market-sheet__footer">
                  <div className="cart-total">
                    <span>Total estimado</span>
                    <strong>{money.format(cartTotal)}</strong>
                  </div>
                  <Button className="lime-button checkout-button" type="button" onClick={handleCheckout}>
                    Continuar con la compra
                    <ArrowRight />
                  </Button>
                  <small className="sheet-footnote">Demo sin cobro real · precios en USD</small>
                </SheetFooter>
              ) : null}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent className="market-sheet detail-sheet" side="right">
          {selectedProduct ? (
            <>
              <div className="detail-art-wrap">
                <ProductArtwork product={selectedProduct} />
              </div>
              <SheetHeader className="market-sheet__header detail-header">
                <Badge className="detail-badge"><ShieldCheck /> Publicación verificada</Badge>
                <SheetTitle>{selectedProduct.service} · {selectedProduct.plan}</SheetTitle>
                <SheetDescription>{selectedProduct.note}. {selectedProduct.delivery} por parte de {selectedProduct.seller}.</SheetDescription>
              </SheetHeader>
              <div className="detail-specs">
                <div><span>Modalidad</span><strong>Suscripción autorizada</strong></div>
                <div><span>Categoría</span><strong>{selectedProduct.category}</strong></div>
                <div><span>Vendedor</span><strong>{selectedProduct.seller}</strong></div>
              </div>
              <SheetFooter className="market-sheet__footer detail-footer">
                <div className="detail-price-row">
                  <span>Precio</span>
                  <strong>{money.format(selectedProduct.price)} <small>{selectedProduct.cadence}</small></strong>
                </div>
                <Button
                  className="lime-button checkout-button"
                  type="button"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                    setIsCartOpen(true);
                  }}
                >
                  Añadir al carrito
                  <Plus />
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={isSellOpen} onOpenChange={setIsSellOpen}>
        <SheetContent className="market-sheet" side="right">
          {sellComplete ? (
            <div className="success-state seller-success">
              <span className="success-icon"><Check /></span>
              <SheetTitle>Publicación recibida.</SheetTitle>
              <SheetDescription>
                La revisaríamos antes de publicarla. En esta demo no se envía información a ningún servicio.
              </SheetDescription>
              <Button className="lime-button" type="button" onClick={() => { setSellComplete(false); setIsSellOpen(false); }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <SheetHeader className="market-sheet__header">
                <SheetTitle>Vender un plan autorizado</SheetTitle>
                <SheetDescription>Cuéntanos qué quieres ofrecer. Tu publicación pasa por revisión antes de aparecer.</SheetDescription>
              </SheetHeader>
              <form
                className="seller-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSellComplete(true);
                }}
              >
                <label htmlFor="seller-platform">
                  Plataforma
                  <Input id="seller-platform" required placeholder="Ej. Cineora" />
                </label>
                <label htmlFor="seller-plan">
                  Nombre del plan
                  <Input id="seller-plan" required placeholder="Ej. Premium mensual" />
                </label>
                <label htmlFor="seller-price">
                  Precio mensual
                  <Input id="seller-price" required type="number" min="1" step="0.01" placeholder="8.90" />
                </label>
                <div className="seller-form-note"><ShieldCheck /> Nunca pedimos contraseñas de tu cuenta.</div>
                <Button className="lime-button" type="submit">
                  Enviar para revisión
                  <ArrowRight />
                </Button>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={isPurchasesOpen} onOpenChange={setIsPurchasesOpen}>
        <SheetContent className="market-sheet" side="right">
          <SheetHeader className="market-sheet__header">
            <SheetTitle>Mis compras</SheetTitle>
            <SheetDescription>Aquí aparecerían tus accesos después de una compra real.</SheetDescription>
          </SheetHeader>
          <div className="purchase-empty">
            <span className="purchase-empty__number">0</span>
            <h3>Todavía no tienes compras.</h3>
            <p>Explora el catálogo y guarda tus planes favoritos para después.</p>
            <Button className="dark-button" type="button" onClick={() => setIsPurchasesOpen(false)}>
              Explorar catálogo
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
