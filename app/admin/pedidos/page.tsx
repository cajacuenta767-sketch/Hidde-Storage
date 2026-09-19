import Link from 'next/link';
import { ArrowRight, Filter, Search } from 'lucide-react';

import { RenewalTable } from '@/components/admin/renewal-table';
import {
  getAdminRenewalRequests,
  isRenewalStatus,
  renewalStatuses,
} from '@/lib/admin/data';
import { getAdminPurchaseOrders } from '@/lib/admin/purchase-orders';
import { formatAdminDate, formatAdminMoney } from '@/lib/admin/presentation';
import { renewalStatusMeta } from '@/lib/admin/presentation';

const purchaseLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  payment_review: 'Pago en revisión',
  paid: 'Pagado',
  fulfilling: 'Preparando acceso',
  token_issued: 'Token emitido',
  delivered: 'Entregado',
  expired: 'Vencido',
  failed: 'Fallido',
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const search = typeof query.q === 'string' ? query.q.slice(0, 100) : '';
  const status =
    typeof query.status === 'string' && isRenewalStatus(query.status)
      ? query.status
      : 'all';
  const [purchases, rows] = await Promise.all([
    getAdminPurchaseOrders(),
    getAdminRenewalRequests({ query: search, status }),
  ]);

  return (
    <div className="account-page admin-page">
      <header className="account-page-header">
        <div>
          <h1>Pedidos</h1>
          <p>Revisa solicitudes de renovación y su estado de pago.</p>
        </div>
      </header>

      <form className="admin-toolbar" action="/admin/pedidos">
        <label className="admin-search">
          <Search />
          <span className="sr-only">Buscar pedidos</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por pedido, cliente o servicio"
          />
        </label>
        <label className="admin-filter">
          <Filter />
          <span className="sr-only">Filtrar por estado</span>
          <select name="status" defaultValue={status}>
            <option value="all">Todos los estados</option>
            {renewalStatuses.map((value) => (
              <option key={value} value={value}>
                {renewalStatusMeta[value].label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="account-button account-button--secondary"
          type="submit"
        >
          Aplicar filtros
        </button>
      </form>

      <div className="account-section-heading">
        <div>
          <h2>Compras del catálogo</h2>
          <p>Pedidos automáticos de Perú y pedidos manuales de Bolivia.</p>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Servicios</th>
              <th>País</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length ? (
              purchases.map((order) => (
                <tr key={order.publicId}>
                  <td data-label="Pedido">
                    <strong>{order.publicId}</strong>
                    <small>{formatAdminDate(order.createdAt, true)}</small>
                  </td>
                  <td data-label="Cliente">
                    <strong>{order.customerName}</strong>
                    <small>{order.customerEmail}</small>
                  </td>
                  <td data-label="Servicios">
                    <strong>{order.services.join(', ')}</strong>
                    <small>{order.paymentMethodCode}</small>
                  </td>
                  <td data-label="País">
                    {order.marketCode === 'PE' ? 'Perú' : 'Bolivia'}
                  </td>
                  <td data-label="Total">
                    <strong>
                      {formatAdminMoney(order.totalAmountMinor, order.currency)}
                    </strong>
                  </td>
                  <td data-label="Estado">
                    <span className="status-badge status-badge--info">
                      {purchaseLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div className="admin-row-actions">
                      <Link
                        aria-label={`Ver pedido ${order.publicId}`}
                        href={`/admin/pedidos/compra/${order.publicId}`}
                      >
                        Ver <ArrowRight aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No hay compras del catálogo todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="account-section-heading">
        <div>
          <h2>Renovaciones</h2>
          <p>Solicitudes enviadas desde suscripciones existentes.</p>
        </div>
      </div>

      <div className="admin-results-line">
        <strong>{rows.length}</strong>{' '}
        {rows.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
      </div>
      <RenewalTable rows={rows} />
    </div>
  );
}
