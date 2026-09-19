'use client';

import { BadgePercent, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { MarketCode, PromoAnnouncement } from '@/lib/catalog-types';

const dismissStorageKey = 'dorapass:announcements:v1';
const rotationMs = 6000;

const defaultMessages = [
  '🔥 Ofertas en streaming: paga menos que el precio oficial',
  'Paga en tu moneda con Yape, Plin, QR o transferencia',
  'Garantía durante todos los días de tu plan',
];

export function AnnouncementBar({
  announcements,
  marketCode,
}: {
  announcements: PromoAnnouncement[];
  marketCode: MarketCode;
}) {
  const messages = useMemo(() => {
    const scoped = announcements
      .filter(
        (announcement) =>
          announcement.marketCode === null ||
          announcement.marketCode === marketCode,
      )
      .map((announcement) => announcement.title);
    return scoped.length > 0 ? scoped : defaultMessages;
  }, [announcements, marketCode]);
  const signature = messages.join('|');

  const [isDismissed, setIsDismissed] = useState(true);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setIsDismissed(
          window.localStorage.getItem(dismissStorageKey) === signature,
        );
      } catch {
        setIsDismissed(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [signature]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = window.setInterval(() => {
      setRotation((current) => current + 1);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, [messages.length]);

  const activeIndex = rotation % messages.length;

  if (isDismissed) return null;

  function dismiss() {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(dismissStorageKey, signature);
    } catch {
      // Sin almacenamiento disponible la barra solo se oculta en esta visita.
    }
  }

  return (
    <section className="announce-bar" aria-label="Anuncios de DoraPass">
      <div className="shell announce-bar__inner">
        <span className="announce-bar__icon" aria-hidden="true">
          <BadgePercent />
        </span>
        <p className="announce-bar__message" key={activeIndex} aria-live="polite">
          {messages[activeIndex]}
        </p>
        <button
          className="announce-bar__close"
          type="button"
          onClick={dismiss}
          aria-label="Cerrar anuncios"
        >
          <X />
        </button>
      </div>
    </section>
  );
}
