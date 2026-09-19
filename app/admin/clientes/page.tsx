import { getAdminCustomers } from '@/lib/admin/data';
import { formatAdminDate } from '@/lib/admin/presentation';

export default async function AdminCustomersPage() {
  const rows = await getAdminCustomers();
  return (
    <div className="account-page admin-page">
      <header className="account-page-header"><div><h1>Clientes</h1><p>Cuentas registradas para Perú y Bolivia.</p></div></header>
      <div className="admin-results-line"><strong>{rows.length}</strong> clientes registrados</div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Cliente</th><th>Contacto</th><th>País</th><th>Suscripciones</th><th>Último ingreso</th><th>Estado</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td><strong>{row.fullName}</strong><small>Cliente #{row.id}</small></td>
            <td><strong>{row.email}</strong><small>{row.phoneE164}</small></td>
            <td>{row.marketCode === 'PE' ? 'Perú' : 'Bolivia'}</td>
            <td><strong>{row.subscriptionsCount}</strong></td>
            <td>{formatAdminDate(row.lastLoginAt, true)}</td>
            <td><span className={`status-badge ${row.status === 'active' ? '' : 'status-badge--muted'}`}>{row.status === 'active' ? 'Activo' : row.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
