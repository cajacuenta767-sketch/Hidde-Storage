import { MessageCircle } from 'lucide-react';

import { getAdminPaymentMethods } from '@/lib/admin/data';

export default async function AdminSettingsPage() {
  const methods = await getAdminPaymentMethods();
  return (
    <div className="account-page admin-page">
      <header className="account-page-header">
        <div>
          <h1>Configuración</h1>
          <p>Canal único para recibir solicitudes de compra.</p>
        </div>
      </header>
      <div className="admin-settings-notice">
        <MessageCircle />
        <div>
          <strong>Ventas directas por WhatsApp</strong>
          <span>
            Todos los pedidos se envían al +51 972 262 984 con el producto,
            plan, acceso, duración, país y total.
          </span>
        </div>
      </div>
      <section className="account-section admin-section">
        <div className="account-section-heading">
          <div>
            <h2>Canal de venta</h2>
            <p>No hay pasarelas de pago activas.</p>
          </div>
        </div>
        <div className="admin-settings-list">
          {methods.map((method) => (
            <article key={`${method.marketCode}:${method.code}`}>
              <span>
                <MessageCircle />
              </span>
              <div>
                <strong>{method.name}</strong>
                <small>
                  {method.marketCode === 'PE' ? 'Perú' : 'Bolivia'} ·{' '}
                  {method.instructions}
                </small>
              </div>
              <span
                className={`status-badge ${method.isActive ? '' : 'status-badge--muted'}`}
              >
                {method.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
