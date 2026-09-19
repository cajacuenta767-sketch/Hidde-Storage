import { getAdminSubscriptions } from '@/lib/admin/data';
import { formatAdminDate, formatAdminMoney } from '@/lib/admin/presentation';

export default async function AdminSubscriptionsPage() {
  const rows = await getAdminSubscriptions();
  return (
    <div className="account-page admin-page">
      <header className="account-page-header"><div><h1>Suscripciones</h1><p>Estado y vencimiento de todos los planes registrados.</p></div></header>
      <div className="admin-results-line"><strong>{rows.length}</strong> suscripciones registradas</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Cliente</th><th>Servicio</th><th>Acceso</th><th>País</th><th>Vencimiento</th><th>Precio</th><th>Estado</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td><strong>{row.customerName}</strong><small>Suscripción #{row.id}</small></td>
            <td><strong>{row.serviceName}</strong><small>{row.planName}</small></td>
            <td>{row.accessTypeName}</td>
            <td>{row.marketCode === 'PE' ? 'Perú' : 'Bolivia'}</td>
            <td><strong>{formatAdminDate(row.expiresAt)}</strong><small>{row.time.remainingLabel}</small></td>
            <td>{formatAdminMoney(row.purchasePriceMinor, row.currency)}</td>
            <td><span className={`status-badge status-badge--${row.time.tone}`}>{row.time.stateLabel}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
