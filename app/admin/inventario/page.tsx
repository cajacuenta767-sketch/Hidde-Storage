import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, Boxes, Clock3, Plus, Search, ShieldCheck, UsersRound } from 'lucide-react';

import {
  getInventoryAccounts,
  serviceAccountStatuses,
  type ServiceAccountStatus,
} from '@/lib/admin/inventory-data';
import {
  renewalLabel,
  serviceAccountStatusMeta,
} from '@/lib/admin/inventory-presentation';
import { formatAdminDate, formatAdminMoney } from '@/lib/admin/presentation';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const requestedStatus = filters.status ?? 'all';
  const status = serviceAccountStatuses.includes(requestedStatus as ServiceAccountStatus)
    ? (requestedStatus as ServiceAccountStatus)
    : 'all';
  const rows = await getInventoryAccounts({ query: filters.q ?? '', status });
  const totalProfiles = rows.reduce((total, row) => total + row.profileCount, 0);
  const occupied = rows.reduce((total, row) => total + row.occupiedCount, 0);
  const reserved = rows.reduce((total, row) => total + row.reservedCount, 0);
  const available = rows.reduce((total, row) => total + row.availableCount, 0);
  const incidents = rows.reduce((total, row) => total + row.openIncidents, 0);

  return (
    <div className="account-page admin-page inventory-page">
      <header className="account-page-header account-page-header--actions">
        <div><h1>Inventario de cuentas</h1><p>Controla cuentas maestras, perfiles, ocupación, renovaciones y accesos.</p></div>
        <Link className="account-button" href="/admin/inventario/nueva"><Plus /> Nueva cuenta</Link>
      </header>

      <section className="inventory-summary-grid" aria-label="Resumen del inventario">
        <article><span><Boxes /></span><div><strong>{rows.length}</strong><small>Cuentas visibles</small></div></article>
        <article><span><UsersRound /></span><div><strong>{occupied}/{totalProfiles}</strong><small>Perfiles ocupados</small></div></article>
        <article><span><Clock3 /></span><div><strong>{reserved}</strong><small>Perfiles reservados</small></div></article>
        <article><span><ShieldCheck /></span><div><strong>{available}</strong><small>Cupos disponibles</small></div></article>
        <article className={incidents > 0 ? 'inventory-summary-card--alert' : ''}><span><AlertTriangle /></span><div><strong>{incidents}</strong><small>Incidencias abiertas</small></div></article>
      </section>

      <form className="admin-toolbar inventory-toolbar" action="/admin/inventario">
        <label className="admin-search"><Search /><span className="sr-only">Buscar inventario</span><input name="q" defaultValue={filters.q ?? ''} placeholder="Buscar plataforma, plan o código" /></label>
        <label className="admin-filter"><span className="sr-only">Estado</span><select name="status" defaultValue={status}><option value="all">Todos los estados</option>{serviceAccountStatuses.map((value) => <option key={value} value={value}>{serviceAccountStatusMeta[value].label}</option>)}</select></label>
        <button className="account-button account-button--secondary" type="submit">Filtrar</button>
      </form>

      <div className="admin-results-line"><strong>{rows.length}</strong> cuentas encontradas</div>
      {rows.length > 0 ? (
        <div className="admin-table-wrap inventory-table-wrap">
          <table className="admin-table inventory-table">
            <thead><tr><th>Cuenta</th><th>Plan</th><th>Ocupación</th><th>Renovación</th><th>Costo</th><th>Incidencias</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{rows.map((row) => {
              const meta = serviceAccountStatusMeta[row.status];
              return <tr key={row.id}>
                <td data-label="Cuenta" aria-label={`Cuenta ${row.serviceName}, código ${row.internalCode}`}><div className="inventory-account-cell"><span><Image src={row.imagePath} alt={row.imageAlt} fill sizes="52px" /></span><div><strong>{row.serviceName}</strong><small>{row.internalCode}</small></div></div></td>
                <td data-label="Plan"><strong>{row.planLabel}</strong><small>{row.capacity} cupos configurados</small></td>
                <td data-label="Ocupación" aria-label={`${row.occupiedCount} ocupados, ${row.reservedCount} reservados y ${row.availableCount} disponibles`}><div className="inventory-occupancy"><div><strong>{row.occupiedCount}/{row.profileCount}</strong><span>{row.occupancyPercent}%</span></div><span><i style={{ width: `${row.occupancyPercent}%` }} /></span><small>{row.reservedCount > 0 ? `${row.reservedCount} reservados · ` : ''}{row.availableCount} disponibles</small></div></td>
                <td data-label="Renovación"><strong>{formatAdminDate(row.renewalDate)}</strong><small className={row.daysToRenewal !== null && row.daysToRenewal <= 7 ? 'inventory-text-alert' : ''}>{renewalLabel(row.daysToRenewal)}</small></td>
                <td data-label="Costo">{row.costMinor !== null && row.costCurrency ? <strong>{formatAdminMoney(row.costMinor, row.costCurrency)}</strong> : <span>Sin registro</span>}</td>
                <td data-label="Incidencias"><span className={row.openIncidents > 0 ? 'inventory-count-alert' : 'inventory-count-ok'}>{row.openIncidents}</span></td>
                <td data-label="Estado"><span className={`status-badge status-badge--${meta.tone}`}>{meta.label}</span></td>
                <td data-label="Acciones"><Link className="inventory-detail-link" href={`/admin/inventario/${row.id}`}>Administrar</Link></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : <div className="admin-empty"><Boxes /><strong>No encontramos cuentas</strong><span>Cambia los filtros o agrega la primera cuenta al inventario.</span></div>}
    </div>
  );
}
