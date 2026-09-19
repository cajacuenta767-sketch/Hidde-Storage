import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { ResolveIncidentForm } from '@/components/admin/inventory-forms';
import {
  getAccountIncidents,
  incidentStatuses,
  type IncidentStatus,
} from '@/lib/admin/inventory-data';
import {
  incidentPriorityMeta,
  incidentStatusMeta,
} from '@/lib/admin/inventory-presentation';
import { formatAdminDate } from '@/lib/admin/presentation';

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requested = (await searchParams).status ?? 'all';
  const status = incidentStatuses.includes(requested as IncidentStatus) ? requested as IncidentStatus : 'all';
  const rows = await getAccountIncidents(status);
  return (
    <div className="account-page admin-page inventory-page">
      <header className="account-page-header"><div><h1>Incidencias</h1><p>Prioriza fallas de acceso, PIN, renovación o proveedor y registra su solución.</p></div></header>
      <form className="admin-toolbar inventory-toolbar inventory-toolbar--short" action="/admin/incidencias"><label className="admin-filter"><AlertTriangle /><span className="sr-only">Estado</span><select name="status" defaultValue={status}><option value="all">Todos los estados</option>{incidentStatuses.map((value) => <option key={value} value={value}>{incidentStatusMeta[value].label}</option>)}</select></label><button className="account-button account-button--secondary" type="submit">Aplicar</button></form>
      <div className="admin-results-line"><strong>{rows.length}</strong> incidencias</div>
      {rows.length > 0 ? <div className="inventory-incidents-board">{rows.map((row) => {
        const incidentStatus = incidentStatusMeta[row.status as IncidentStatus];
        const priority = incidentPriorityMeta[row.priority] ?? incidentPriorityMeta.medium;
        return <article key={row.id}><div className="inventory-incidents-board__top"><span className={`inventory-incident-icon inventory-incident-icon--${priority.tone}`}><AlertTriangle /></span><div><small>{row.serviceName} · {row.internalCode}{row.profileName ? ` · ${row.profileName}` : ''}</small><h2>{row.title}</h2></div><span className={`status-badge status-badge--${priority.tone}`}>{priority.label}</span><span className={`status-badge status-badge--${incidentStatus.tone}`}>{incidentStatus.label}</span></div><p>{row.description}</p><footer><span>Creada {formatAdminDate(row.createdAt, true)}{row.customerName ? ` · ${row.customerName}` : ''}</span><div><Link className="inventory-detail-link" href={`/admin/inventario/${row.accountId}`}>Ver cuenta</Link>{['open', 'in_review'].includes(row.status) ? <ResolveIncidentForm incidentId={row.id} /> : null}</div></footer></article>;
      })}</div> : <div className="admin-empty"><AlertTriangle /><strong>No hay incidencias en esta vista</strong><span>Las nuevas incidencias aparecerán aquí ordenadas por fecha.</span></div>}
    </div>
  );
}
