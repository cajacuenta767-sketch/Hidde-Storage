import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { getCurrentCustomer } from '@/lib/auth/session';
import { safeNextPath } from '@/lib/auth/validation';

export const metadata: Metadata = { title: 'Ingresar · DoraPass' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; password?: string }>;
}) {
  const query = await searchParams;
  const customer = await getCurrentCustomer();
  if (customer) {
    redirect(safeNextPath(query.next, customer.role === 'admin' ? '/admin' : '/mi-cuenta'));
  }
  return (
    <AuthShell title="Bienvenido de nuevo" description="Ingresa para revisar tus suscripciones y próximas renovaciones.">
      <LoginForm nextPath={safeNextPath(query.next)} passwordUpdated={query.password === 'updated'} />
    </AuthShell>
  );
}
