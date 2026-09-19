import Link from 'next/link';
import { ArrowRight, Bell, Clock3, CreditCard, ShieldCheck } from 'lucide-react';

import { SubscriptionCard } from '@/components/account/subscription-card';
import { requireCustomer } from '@/lib/auth/session';
import { getCustomerDashboard } from '@/lib/subscriptions/data';

export default async function CustomerDashboardPage() {
  const customer = await requireCustomer();
  const dashboard = await getCustomerDashboard(customer.id);
  const urgent = dashboard.subscriptions
    .filter((item) => item.time.daysRemaining >= 0 && item.time.daysRemaining <= 7)
    .toSorted((left, right) => left.time.daysRemaining - right.time.daysRemaining)[0];

  return (
    <div className="account-page">
      <header className="account-page-header">
        <div><h1>Hola, {customer.firstName}</h1><p>Revisa tus suscripciones y renueva antes de que venzan.</p></div>
      </header>

      {urgent ? (
        <Link className={`expiry-banner expiry-banner--${urgent.time.tone}`} href={`/mi-cuenta/suscripciones/${urgent.id}`}>
          <Clock3 />
          <span><strong>{urgent.serviceName} {urgent.time.daysRemaining === 0 ? 'vence hoy' : `vence en ${urgent.time.daysRemaining} ${urgent.time.daysRemaining === 1 ? 'día' : 'días'}`}</strong><small>Revisa el plan y prepara la renovación.</small></span>
          <ArrowRight />
        </Link>
      ) : null}

      <section className="account-summary" aria-label="Resumen de mi cuenta">
        <article><span className="summary-icon"><CreditCard /></span><div><strong>{dashboard.summary.active}</strong><span>Suscripciones activas</span><small>Servicios actualmente disponibles</small></div></article>
        <article><span className="summary-icon"><Clock3 /></span><div><strong>{dashboard.summary.expiring}</strong><span>Por vencer pronto</span><small>Planes con 7 días o menos</small></div></article>
        <article><span className="summary-icon"><Bell /></span><div><strong>{dashboard.summary.unread}</strong><span>Notificaciones sin leer</span><small>Revisa tus novedades</small></div></article>
      </section>

      <section className="account-section">
        <div className="account-section-heading"><div><h2>Mis suscripciones</h2><p>Fechas, estado y renovación de tus planes.</p></div><Link href="/mi-cuenta/suscripciones">Ver todas <ArrowRight /></Link></div>
        {dashboard.subscriptions.length > 0 ? (
          <div className="subscription-list">{dashboard.subscriptions.slice(0, 4).map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} />)}</div>
        ) : (
          <div className="account-empty"><ShieldCheck /><h3>Aún no tienes suscripciones.</h3><p>Cuando confirmemos tu primera compra aparecerá aquí.</p><Link className="account-button" href="/">Explorar catálogo</Link></div>
        )}
      </section>

      <section className="account-help-strip"><ShieldCheck /><div><strong>¿Necesitas ayuda con una suscripción?</strong><span>Escríbenos y revisaremos tu caso sin mostrar tus credenciales.</span></div><Link href="/mi-cuenta/soporte">Ir a soporte <ArrowRight /></Link></section>
    </div>
  );
}
