import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Nueva contraseña · DoraPass' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  return (
    <AuthShell title="Crea una nueva contraseña" description="El enlace es válido durante 30 minutos y solo puede utilizarse una vez.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
