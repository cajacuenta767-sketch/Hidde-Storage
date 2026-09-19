import Link from 'next/link';
import { Search, UserRoundCheck } from 'lucide-react';

import { ReleaseProfileForm } from '@/components/admin/inventory-forms';
import { getProfileAssignments } from '@/lib/admin/inventory-data';
import { formatAdminDate } from '@/lib/admin/presentation';

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requested = (await searchParams).status;
  const status = requested === 'history' || requested === 'all' ? requested : 'active';
  const rows = await getProfileAssignments(status);
  return (
    <div className="account-page admin-page inventory-page">
      <header className="account-page-header"><div><h1>Asignaciones</h1><p>Consulta qué cliente ocupa cada perfil y cuándo termina su acceso.</p></div></header>
      <form className="admin-toolbar inventory-toolbar inventory-toolbar--short" action="/admin/asignaciones">
        <label className="admin-filter"><Search /><span className="sr-only">Estado</span><select name="status" defaultValue={status}><option value="active">Asignaciones activas</option><option value="history">Historial liberado</option><option value="all">Todas</option></select></label>
        <button className="account-button account-button--secondary" type="submit">Aplicar</button>
      </form>
      <div className="admin-results-line"><strong>{rows.length}</strong> asignaciones</div>
      {rows.length > 0 ? <div className="admin-table-wrap"><table className="admin-table assignment-table"><thead><tr><th>Cuenta y perfil</th><th>Cliente</th><th>Suscripción</th><th>Inicio</th><th>Vencimiento</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
        <td data-label="Cuenta"><strong>{row.serviceName} · {row.profileName}</strong><small>{row.internalCode} · perfil {row.profilePosition}</small></td>
        <td data-label="Cliente"><strong>{row.customerName}</strong><small>{row.customerEmail} · {row.marketCode === 'PE' ? 'Perú' : 'Bolivia'}</small></td>
        <td data-label="Suscripción"><strong>#{row.subscriptionId}</strong><small>Asignación #{row.id}</small></td>
        <td data-label="Inicio">{formatAdminDate(row.startsAt)}</td>
        <td data-label="Vencimiento"><strong>{formatAdminDate(row.expiresAt)}</strong></td>
        <td data-label="Estado"><span className={`status-badge status-badge--${row.status === 'active' ? 'active' : 'muted'}`}>{row.status === 'active' ? 'Activa' : 'Liberada'}</span></td>
        <td data-label="Acciones"><div className="admin-row-actions"><Link href={`/admin/inventario/${row.accountId}`}>Ver cuenta</Link>{row.status === 'active' ? <ReleaseProfileForm assignmentId={row.id} /> : null}</div></td>
      </tr>)}</tbody></table></div> : <div className="admin-empty"><UserRoundCheck /><strong>No hay asignaciones en esta vista</strong><span>Los perfiles ocupados aparecerán aquí.</span></div>}
    </div>
  );
}
