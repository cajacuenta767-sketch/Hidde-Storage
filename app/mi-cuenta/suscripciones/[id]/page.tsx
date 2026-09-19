import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { RenewalForm } from '@/components/account/renewal-form';
import { CustomerAccessPanel } from '@/components/account/customer-access-panel';
import { requireCustomer } from '@/lib/auth/session';
import { getCustomerAccessSummary } from '@/lib/subscriptions/access';
import { getCustomerSubscription } from '@/lib/subscriptions/data';
import { formatCustomerDate } from '@/lib/subscriptions/dates';

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customer = await requireCustomer();
  const { id } = await params;
  const subscriptionId = Number(id);
  if (!Number.isSafeInteger(subscriptionId)) notFound();
  const [detail, access] = await Promise.all([
    getCustomerSubscription(customer.id, subscriptionId),
    getCustomerAccessSummary(customer.id, subscriptionId),
  ]);
  if (!detail) notFound();
  const { subscription } = detail;
  const whatsapp = (process.env.DORAPASS_WHATSAPP_NUMBER ?? '').replace(
    /\D/g,
    '',
  );
  const supportMessage = encodeURIComponent(
    `Hola, necesito ayuda con mi suscripción DoraPass #${subscription.id} de ${subscription.serviceName}.`,
  );

  return (
    <div className="account-page">
      <Link className="account-back-link" href="/mi-cuenta/suscripciones">
        <ArrowLeft /> Volver a mis suscripciones
      </Link>
      <header className="subscription-detail-header">
        <div className="subscription-detail-product">
          <span>
            <Image
              src={subscription.imagePath}
              alt={subscription.imageAlt}
              width={100}
              height={74}
            />
          </span>
          <div>
            <h1>{subscription.serviceName}</h1>
            <p>
              {subscription.planName} · {subscription.accessTypeName}
            </p>
          </div>
        </div>
        <span
          className={`status-badge status-badge--${subscription.time.tone}`}
        >
          {subscription.time.stateLabel}
        </span>
      </header>

      <section className="subscription-detail-grid">
        <div>
          <CalendarDays />
          <span>Fecha de inicio</span>
          <strong>
            {formatCustomerDate(
              subscription.startDate,
              subscription.marketCode,
            )}
          </strong>
        </div>
        <div>
          <Clock3 />
          <span>Fecha de vencimiento</span>
          <strong>
            {formatCustomerDate(
              subscription.expiresAt,
              subscription.marketCode,
            )}
          </strong>
        </div>
        <div>
          <UserRound />
          <span>Modalidad</span>
          <strong>{subscription.accessTypeName}</strong>
        </div>
        <div>
          <ShieldCheck />
          <span>Garantía</span>
          <strong>
            Hasta{' '}
            {formatCustomerDate(
              subscription.warrantyUntil,
              subscription.marketCode,
            )}
          </strong>
        </div>
      </section>

      <section
        className={`subscription-countdown subscription-countdown--${subscription.time.tone}`}
      >
        <div>
          <span>Tiempo restante</span>
          <strong>{subscription.time.remainingLabel}</strong>
        </div>
        <span
          className={`subscription-progress__track subscription-progress__track--${subscription.time.tone}`}
        >
          <i style={{ width: `${subscription.time.progressPercent}%` }} />
        </span>
        <small>
          Plan contratado por {subscription.durationMonths}{' '}
          {subscription.durationMonths === 1 ? 'mes' : 'meses'}
        </small>
      </section>

      {access ? (
        <CustomerAccessPanel subscriptionId={subscription.id} {...access} />
      ) : null}

      <section className="subscription-detail-section" id="renovar">
        <div className="account-section-heading">
          <div>
            <h2>Renovar suscripción</h2>
            <p>Elige cuánto tiempo deseas agregar a tu plan.</p>
          </div>
        </div>
        <RenewalForm
          subscriptionId={subscription.id}
          currency={subscription.currency}
          marketCode={subscription.marketCode}
          options={detail.renewalOptions}
        />
      </section>

      <div className="subscription-detail-columns">
        <section className="subscription-detail-section">
          <h2>Historial</h2>
          {detail.events.length ? (
            <div className="event-list">
              {detail.events.map((event) => (
                <div key={event.id}>
                  <CheckCircle2 />
                  <span>
                    <strong>{event.description}</strong>
                    <small>
                      {new Intl.DateTimeFormat('es', {
                        dateStyle: 'medium',
                      }).format(event.createdAt)}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="account-empty-inline">
              Aún no hay movimientos adicionales.
            </p>
          )}
        </section>
        <section className="subscription-detail-section">
          <h2>Soporte y garantía</h2>
          <p>
            Si tienes un problema con el acceso, indícanos el número de
            suscripción. Nunca envíes contraseñas por el formulario.
          </p>
          <a
            className="account-button account-button--secondary"
            href={`${whatsapp ? `https://wa.me/${whatsapp}` : 'https://wa.me/'}?text=${supportMessage}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle /> Solicitar soporte
          </a>
        </section>
      </div>
    </div>
  );
}
