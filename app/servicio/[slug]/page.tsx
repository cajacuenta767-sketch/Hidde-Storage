import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarCheck2, ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';

import { getProductPage } from '@/lib/catalog-page';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

function moneyFormatter(marketCode: 'PE' | 'BO') {
  return new Intl.NumberFormat(marketCode === 'PE' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency: marketCode === 'PE' ? 'PEN' : 'BOB',
    maximumFractionDigits: 2,
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductPage(slug);
  if (!product) return { title: 'Servicio no encontrado · DoraPass' };
  const cheapestPe = product.offers
    .filter((offer) => offer.marketCode === 'PE')
    .reduce<number | null>(
      (min, offer) => (min === null || offer.price < min ? offer.price : min),
      null,
    );
  const priceText =
    cheapestPe !== null
      ? ` desde S/ ${cheapestPe.toFixed(2)} al mes en Perú`
      : '';
  return {
    title: `${product.serviceName} ${product.planName} · DoraPass`,
    description:
      `Compra ${product.serviceName} (${product.planName})${priceText}. ` +
      'Pago con Yape, Plin, QR o transferencia en Perú y Bolivia, con garantía todo el plan.',
    alternates: { canonical: `/servicio/${product.slug}` },
    openGraph: {
      title: `${product.serviceName} ${product.planName} · DoraPass`,
      description: `Acceso a ${product.serviceName} con pago local y garantía.${priceText}`,
      images: product.imagePath ? [{ url: product.imagePath }] : undefined,
    },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductPage(slug);
  if (!product) notFound();

  const artStyle = {
    backgroundColor: product.accent,
  } as CSSProperties;

  return (
    <main className="service-page">
      <header className="service-page__header">
        <div className="shell service-page__header-inner">
          <Link className="service-page__brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>DoraPass</span>
          </Link>
          <Link className="service-page__back" href="/">
            Ver todo el catálogo
          </Link>
        </div>
      </header>

      <div className="shell service-page__content">
        <section className="service-page__hero">
          <div className="service-page__art" style={artStyle} aria-hidden="true">
            <Image
              src={product.imagePath}
              alt=""
              width={420}
              height={260}
              priority
            />
          </div>
          <div className="service-page__copy">
            <p className="service-page__category">{product.category}</p>
            <h1>
              {product.serviceName}{' '}
              <span>· {product.planName}</span>
            </h1>
            <p className="service-page__description">{product.description}</p>
            <ul className="service-page__benefits">
              <li>
                <ShieldCheck /> Garantía durante todos los días del plan
              </li>
              <li>
                <CalendarCheck2 /> {product.deliveryLabel}
              </li>
            </ul>
            <Link
              className="service-page__cta"
              href={`/?producto=${product.slug}`}
            >
              Comprar ahora <ArrowRight />
            </Link>
          </div>
        </section>

        {(['PE', 'BO'] as const).map((marketCode) => {
          const offers = product.offers.filter(
            (offer) => offer.marketCode === marketCode,
          );
          if (offers.length === 0) return null;
          const money = moneyFormatter(marketCode);
          return (
            <section className="service-page__prices" key={marketCode}>
              <h2>
                Precios en {marketCode === 'PE' ? 'Perú (soles)' : 'Bolivia (bolivianos)'}
              </h2>
              <table className="service-price-table">
                <thead>
                  <tr>
                    <th scope="col">Duración</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Precio oficial</th>
                    <th scope="col">Ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={`${marketCode}-${offer.durationMonths}`}>
                      <td>{offer.durationLabel}</td>
                      <td>
                        <strong>{money.format(offer.price)}</strong>
                        {!offer.inStock ? <em> · sin stock</em> : null}
                      </td>
                      <td>
                        {offer.compareAtPrice !== null ? (
                          <s>{money.format(offer.compareAtPrice)}</s>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {offer.discountPercent > 0
                          ? `-${offer.discountPercent}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        <section className="service-page__how">
          <h2>Cómo lo recibes</h2>
          <p>
            Eliges la duración, pagas en tu moneda por Yape, Plin, QR o
            transferencia, y al confirmar el pago recibes un token seguro para
            ver tu acceso en tu cuenta DoraPass. Todos los planes incluyen
            garantía durante los días contratados.
          </p>
          <Link className="service-page__cta" href={`/?producto=${product.slug}`}>
            Elegir duración y comprar <ArrowRight />
          </Link>
        </section>
      </div>
    </main>
  );
}
