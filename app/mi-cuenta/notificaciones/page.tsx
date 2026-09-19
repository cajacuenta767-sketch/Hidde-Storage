import Link from 'next/link';
import { Bell, Check, Clock3 } from 'lucide-react';

import { markAllNotificationsReadAction, markNotificationReadAction } from '@/app/actions/account';
import { requireCustomer } from '@/lib/auth/session';
import { getCustomerNotifications } from '@/lib/subscriptions/data';

export default async function NotificationsPage() {
  const customer = await requireCustomer();
  const notifications = await getCustomerNotifications(customer.id);
  return (
    <div className="account-page">
      <header className="account-page-header account-page-header--actions">
        <div><h1>Notificaciones</h1><p>Avisos importantes sobre tus planes y renovaciones.</p></div>
        {notifications.some((item) => !item.readAt) ? <form action={markAllNotificationsReadAction}><button className="account-button account-button--secondary" type="submit"><Check /> Marcar todas como leídas</button></form> : null}
      </header>
      {notifications.length ? <div className="notification-list">{notifications.map((notification) => (
        <article className={notification.readAt ? 'notification-item' : 'notification-item notification-item--unread'} key={notification.id}>
          <span className="notification-icon">{notification.type.includes('expiry') ? <Clock3 /> : <Bell />}</span>
          <div><strong>{notification.title}</strong><p>{notification.message}</p><small>{new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(notification.createdAt)}</small></div>
          <div className="notification-actions">
            {notification.subscriptionId ? <Link href={`/mi-cuenta/suscripciones/${notification.subscriptionId}`}>Ver suscripción</Link> : null}
            {!notification.readAt ? <form action={markNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id} /><button type="submit" aria-label={`Marcar ${notification.title} como leída`}><Check /></button></form> : null}
          </div>
        </article>
      ))}</div> : <div className="account-empty"><Bell /><h2>No tienes notificaciones</h2><p>Te avisaremos cuando una suscripción necesite tu atención.</p></div>}
    </div>
  );
}
