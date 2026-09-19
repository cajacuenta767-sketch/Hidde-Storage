'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';

import type { MarketCode, PromoBanner } from '@/lib/catalog-types';

const autoplayMs = 5500;

export function PromoBanners({
  banners,
  marketCode,
  onSelect,
}: {
  banners: PromoBanner[];
  marketCode: MarketCode;
  onSelect: (productId: number) => void;
}) {
  const visibleBanners = useMemo(
    () =>
      banners.filter(
        (banner) =>
          banner.marketCode === null || banner.marketCode === marketCode,
      ),
    [banners, marketCode],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelectSnap = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelectSnap();
    emblaApi.on('select', onSelectSnap);
    emblaApi.on('reInit', onSelectSnap);
    return () => {
      emblaApi.off('select', onSelectSnap);
      emblaApi.off('reInit', onSelectSnap);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || isPaused || visibleBanners.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => emblaApi.scrollNext(), autoplayMs);
    return () => window.clearInterval(timer);
  }, [emblaApi, isPaused, visibleBanners.length]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  if (visibleBanners.length === 0) return null;

  return (
    <section
      className="promo-banners"
      aria-label="Ofertas destacadas"
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="promo-banners__viewport" ref={emblaRef}>
        <div className="promo-banners__track">
          {visibleBanners.map((banner) => {
            const artStyle = {
              backgroundColor: banner.accent ?? '#155eef',
              '--art-accent-soft': banner.accentSoft ?? '#e8efff',
            } as CSSProperties;
            return (
              <article className="promo-banner" key={banner.id}>
                <div className="promo-banner__copy">
                  {banner.discountPercent !== null &&
                  banner.discountPercent > 0 ? (
                    <span className="promo-banner__discount">
                      -{banner.discountPercent}% de descuento
                    </span>
                  ) : (
                    <span className="promo-banner__kicker">
                      Oferta destacada
                    </span>
                  )}
                  <h2>{banner.title}</h2>
                  {banner.subtitle ? <p>{banner.subtitle}</p> : null}
                  {banner.productId !== null ? (
                    <button
                      className="promo-banner__cta"
                      type="button"
                      onClick={() => onSelect(banner.productId as number)}
                    >
                      {banner.ctaLabel ?? 'Ver oferta'}
                      <ArrowRight />
                    </button>
                  ) : null}
                </div>
                <div className="promo-banner__art" style={artStyle} aria-hidden="true">
                  {banner.imagePath ? (
                    <Image
                      src={banner.imagePath}
                      alt=""
                      width={360}
                      height={220}
                      sizes="(max-width: 720px) 44vw, 320px"
                    />
                  ) : (
                    <span className="promo-banner__mark">{banner.mark}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {visibleBanners.length > 1 ? (
        <>
          <button
            className="promo-banners__control promo-banners__control--prev"
            type="button"
            aria-label="Oferta anterior"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft />
          </button>
          <button
            className="promo-banners__control promo-banners__control--next"
            type="button"
            aria-label="Oferta siguiente"
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight />
          </button>
          <div className="promo-banners__dots" role="tablist" aria-label="Posición del carrusel">
            {visibleBanners.map((banner, index) => (
              <button
                key={banner.id}
                className={`promo-banners__dot ${index === selectedIndex ? 'promo-banners__dot--active' : ''}`}
                type="button"
                aria-label={`Ir a la oferta ${index + 1}`}
                aria-current={index === selectedIndex}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
