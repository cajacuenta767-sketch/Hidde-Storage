import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';
import { getCurrentCustomer } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Crear cuenta · DoraPass' };

export default async function RegisterPage() {
  const customer = await getCurrentCustomer();
  if (customer) redirect(customer.role === 'admin' ? '/admin' : '/mi-cuenta');
  return (
    <AuthShell title="Crea tu cuenta" description="Regístrate en menos de un minuto y controla todos tus vencimientos.">
      <RegisterForm />
    </AuthShell>
  );
}
