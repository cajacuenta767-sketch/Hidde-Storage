import { CreditCard } from 'lucide-react';

import { SubscriptionCard } from '@/components/account/subscription-card';
import { requireCustomer } from '@/lib/auth/session';
import { getCustomerSubscriptions } from '@/lib/subscriptions/data';

export default async function CustomerSubscriptionsPage() {
  const customer = await requireCustomer();
  const customerSubscriptions = await getCustomerSubscriptions(customer.id);
  return (
    <div className="account-page">
      <header className="account-page-header"><div><h1>Mis suscripciones</h1><p>Consulta el tiempo restante y renueva tus servicios.</p></div></header>
      {customerSubscriptions.length ? <div className="subscription-list">{customerSubscriptions.map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} />)}</div> : <div className="account-empty"><CreditCard /><h2>No tienes suscripciones todavía</h2><p>Tus servicios aparecerán aquí después de confirmar una compra.</p></div>}
    </div>
  );
}
