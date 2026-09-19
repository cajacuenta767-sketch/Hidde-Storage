import { AccountShell } from '@/components/account/account-shell';
import { requireCustomer } from '@/lib/auth/session';
import {
  getCustomerSubscriptions,
  getUnreadNotificationCount,
  syncExpiryNotifications,
} from '@/lib/subscriptions/data';

export default async function CustomerAccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await requireCustomer();
  const customerSubscriptions = await getCustomerSubscriptions(customer.id);
  await syncExpiryNotifications(customer.id, customerSubscriptions);
  const unreadCount = await getUnreadNotificationCount(customer.id);

  return <AccountShell customer={customer} unreadCount={unreadCount}>{children}</AccountShell>;
}
