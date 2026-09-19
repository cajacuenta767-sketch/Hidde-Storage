import { ProfileForms } from '@/components/account/profile-forms';
import { requireCustomer } from '@/lib/auth/session';

export default async function ProfilePage() {
  const customer = await requireCustomer();
  return (
    <div className="account-page">
      <header className="account-page-header"><div><h1>Mi perfil</h1><p>Administra tus datos y la seguridad de tu cuenta.</p></div></header>
      <ProfileForms fullName={customer.fullName} email={customer.email} phoneE164={customer.phoneE164} marketCode={customer.marketCode} />
    </div>
  );
}
