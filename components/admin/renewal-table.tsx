import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';

import { ConfirmPaymentForm } from '@/components/admin/confirm-payment-form';
import type { getAdminRenewalRequests } from '@/lib/admin/data';
import {
  formatAdminDate,
  formatAdminMoney,
  renewalStatusMeta,
} from '@/lib/admin/presentation';

type RenewalRows = Awaited<ReturnType<typeof getAdminRenewalRequests>>;

export function RenewalTable({ rows, compact = false }: { rows: RenewalRows; compact?: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="account-empty admin-empty">
        <ClipboardList />
        <h3>No hay pedidos con estos filtros</h3>
        <p>Los nuevos pedidos de renovación aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className={compact ? 'admin-table admin-table--compact' : 'admin-table'}>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>País</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = renewalStatusMeta[row.status] ?? {
              label: row.status,
              tone: 'muted' as const,
            };
            const canConfirm = row.status === 'pending_payment' || row.status === 'payment_review';
            return (
              <tr key={row.id}>
                <td data-label="Pedido">
                  <strong>DP-{String(row.id).padStart(6, '0')}</strong>
                  {compact ? null : <small>{formatAdminDate(row.createdAt, true)}</small>}
                </td>
                <td data-label="Cliente"><strong>{row.customerName}</strong><small>{row.customerEmail}</small></td>
                <td data-label="Servicio"><strong>{row.serviceName}</strong><small>{row.planName}</small></td>
                <td data-label="País">{row.marketCode === 'PE' ? 'Perú' : 'Bolivia'}</td>
                <td data-label="Total"><strong>{formatAdminMoney(row.priceMinor, row.currency)}</strong></td>
                <td data-label="Estado"><span className={`status-badge status-badge--${status.tone}`}>{status.label}</span></td>
                <td data-label="Acciones">
                  <div className="admin-row-actions">
                    <Link href={`/admin/pedidos/${row.id}`}>Ver <ArrowRight /></Link>
                    {canConfirm ? <ConfirmPaymentForm requestId={row.id} /> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
