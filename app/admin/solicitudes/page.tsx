import { PackageSearch } from 'lucide-react';

import {
  DismissStockRequestsForm,
  RestockForm,
} from '@/components/admin/stock-request-forms';
import { formatAdminDate } from '@/lib/admin/presentation';
import {
  getAdminStockRequestGroups,
  getRecentResolvedStockRequests,
} from '@/lib/admin/stock-requests';

function formatPrice(marketCode: 'PE' | 'BO', amountMinor: number | null) {
  if (amountMinor === null) return 'Precio por confirmar';
  return new Intl.NumberFormat(marketCode === 'PE' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency: marketCode === 'PE' ? 'PEN' : 'BOB',
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export default async function StockRequestsPage() {
  const [groups, resolved] = await Promise.all([
    getAdminStockRequestGroups(),
    getRecentResolvedStockRequests(),
  ]);
  const totalPending = groups.reduce(
    (sum, group) => sum + group.requesters.length,
    0,
  );
  return (
    <div className="account-page admin-page inventory-page">
      <header className="account-page-header">
        <div>
          <h1>Solicitudes de stock</h1>
          <p>
            Clientes que pidieron una opción agotada. Repón el stock y avísales
            con un clic.
          </p>
        </div>
      </header>
      <div className="admin-results-line">
        <strong>{totalPending}</strong> solicitudes pendientes en{' '}
        <strong>{groups.length}</strong> productos
      </div>
      {groups.length > 0 ? (
        <div className="inventory-incidents-board">
          {groups.map((group) => (
            <article key={group.offerVariantId}>
              <div className="inventory-incidents-board__top">
                <span className="inventory-incident-icon inventory-incident-icon--warning">
                  <PackageSearch />
                </span>
                <div>
                  <small>
                    {group.accessTypeName} · {group.durationLabel} ·{' '}
                    {group.marketCode === 'PE' ? 'Perú' : 'Bolivia'} ·{' '}
                    {formatPrice(group.marketCode, group.amountMinor)}
                  </small>
                  <h2>
                    {group.serviceName} — {group.planName}
                  </h2>
                </div>
                <span className="status-badge status-badge--warning">
                  {group.requesters.length} en espera
                </span>
                <span className="status-badge status-badge--muted">
                  Stock actual: {group.currentStock}
                </span>
              </div>
              <ul className="stock-request-list">
                {group.requesters.map((requester) => (
                  <li key={requester.requestId}>
                    <strong>{requester.customerName}</strong>
                    <span>
                      {requester.customerEmail}
                      {requester.customerPhone
                        ? ` · ${requester.customerPhone}`
                        : ''}
                    </span>
                    <small>
                      Solicitado {formatAdminDate(requester.requestedAt, true)}
                    </small>
                  </li>
                ))}
              </ul>
              <footer>
                <RestockForm
                  offerVariantId={group.offerVariantId}
                  pendingCount={group.requesters.length}
                />
                <DismissStockRequestsForm
                  offerVariantId={group.offerVariantId}
                />
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <PackageSearch />
          <strong>No hay solicitudes pendientes</strong>
          <span>
            Cuando un cliente pida una opción sin stock aparecerá aquí y
            recibirás un aviso por Telegram.
          </span>
        </div>
      )}
      {resolved.length > 0 ? (
        <section className="account-section admin-section">
          <div className="account-section-heading">
            <div>
              <h2>Últimas solicitudes atendidas</h2>
              <p>Historial reciente de reposiciones y descartes.</p>
            </div>
          </div>
          <ul className="stock-request-list stock-request-list--muted">
            {resolved.map((row) => (
              <li key={row.requestId}>
                <strong>
                  {row.serviceName} — {row.planName} (
                  {row.marketCode === 'PE' ? 'Perú' : 'Bolivia'})
                </strong>
                <span>
                  {row.customerName} ·{' '}
                  {row.status === 'fulfilled'
                    ? 'avisado de disponibilidad'
                    : 'descartada'}
                </span>
                <small>
                  {row.resolvedAt ? formatAdminDate(row.resolvedAt, true) : ''}
                </small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
