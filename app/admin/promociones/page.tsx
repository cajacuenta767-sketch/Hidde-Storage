import { Megaphone } from 'lucide-react';

import {
  CreatePromotionForm,
  DeletePromotionForm,
  TogglePromotionForm,
} from '@/components/admin/promotion-forms';
import { formatAdminDate } from '@/lib/admin/presentation';
import { getAdminPromotions, getPromotableProducts } from '@/lib/promotions';

function marketLabel(marketCode: string | null) {
  if (marketCode === 'PE') return 'Perú';
  if (marketCode === 'BO') return 'Bolivia';
  return 'Perú y Bolivia';
}

export default async function PromotionsPage() {
  const [rows, products] = await Promise.all([
    getAdminPromotions(),
    getPromotableProducts(),
  ]);
  const banners = rows.filter((row) => row.kind === 'banner');
  const announcements = rows.filter((row) => row.kind === 'announcement');
  return (
    <div className="account-page admin-page inventory-page">
      <header className="account-page-header">
        <div>
          <h1>Promociones</h1>
          <p>
            Administra los banners del carrusel de ofertas y los mensajes de la
            barra de anuncios de la portada.
          </p>
        </div>
      </header>

      <section className="account-section admin-section">
        <div className="account-section-heading">
          <div>
            <h2>Nueva promoción</h2>
            <p>
              Sin banners activos, la portada muestra automáticamente las
              ofertas con mayor descuento y stock.
            </p>
          </div>
        </div>
        <CreatePromotionForm products={products} />
      </section>

      {(
        [
          ['Banners del carrusel', banners],
          ['Anuncios de la barra superior', announcements],
        ] as const
      ).map(([sectionTitle, sectionRows]) => (
        <section className="account-section admin-section" key={sectionTitle}>
          <div className="account-section-heading">
            <div>
              <h2>{sectionTitle}</h2>
              <p>
                {sectionRows.length}{' '}
                {sectionRows.length === 1 ? 'registrada' : 'registradas'}
              </p>
            </div>
          </div>
          {sectionRows.length > 0 ? (
            <ul className="stock-request-list">
              {sectionRows.map((row) => (
                <li key={row.id}>
                  <strong>
                    {row.title}
                    {!row.isActive ? ' · (pausada)' : ''}
                  </strong>
                  <span>
                    {marketLabel(row.marketCode)}
                    {row.productLabel ? ` · ${row.productLabel}` : ''}
                    {row.subtitle ? ` · ${row.subtitle}` : ''}
                  </span>
                  <small>
                    Creada {formatAdminDate(row.createdAt, true)}
                    {row.startsAt
                      ? ` · inicia ${formatAdminDate(row.startsAt, true)}`
                      : ''}
                    {row.endsAt
                      ? ` · termina ${formatAdminDate(row.endsAt, true)}`
                      : ''}
                  </small>
                  <div className="promotion-row-actions">
                    <TogglePromotionForm
                      promotionId={row.id}
                      isActive={row.isActive}
                    />
                    <DeletePromotionForm promotionId={row.id} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-empty">
              <Megaphone />
              <strong>Sin registros</strong>
              <span>Crea la primera promoción con el formulario de arriba.</span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
