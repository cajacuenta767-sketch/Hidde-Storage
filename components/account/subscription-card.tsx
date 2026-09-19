import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react';

import type { CustomerSubscription } from '@/lib/subscriptions/data';
import { formatCustomerDate } from '@/lib/subscriptions/dates';

export function SubscriptionCard({ subscription }: { subscription: CustomerSubscription }) {
  return (
    <article className="subscription-row">
      <div className="subscription-product">
        <span className="subscription-logo">
          <Image src={subscription.imagePath} alt={subscription.imageAlt} width={76} height={56} />
        </span>
        <div>
          <strong>{subscription.serviceName}</strong>
          <span>{subscription.planName}</span>
          <small><UserRound /> {subscription.accessTypeName}</small>
        </div>
      </div>
      <div className="subscription-date"><span>Inicio</span><strong>{formatCustomerDate(subscription.startDate, subscription.marketCode)}</strong></div>
      <div className="subscription-date"><span>Vencimiento</span><strong>{formatCustomerDate(subscription.expiresAt, subscription.marketCode)}</strong></div>
      <div className="subscription-progress">
        <strong>{subscription.time.remainingLabel}</strong>
        <span className={`subscription-progress__track subscription-progress__track--${subscription.time.tone}`}><i style={{ width: `${subscription.time.progressPercent}%` }} /></span>
        <small><CalendarDays /> Plan de {subscription.durationMonths} {subscription.durationMonths === 1 ? 'mes' : 'meses'}</small>
      </div>
      <div className="subscription-actions">
        <span className={`status-badge status-badge--${subscription.time.tone}`}>{subscription.time.stateLabel}</span>
        <div>
          <Link className="account-button account-button--secondary" href={`/mi-cuenta/suscripciones/${subscription.id}`}>Ver detalles</Link>
          <Link className="account-button" href={`/mi-cuenta/suscripciones/${subscription.id}#renovar`}>Renovar <ArrowRight /></Link>
        </div>
      </div>
    </article>
  );
}
