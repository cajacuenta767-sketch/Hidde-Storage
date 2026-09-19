import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { RecoveryForm } from '@/components/auth/recovery-form';

export const metadata: Metadata = { title: 'Recuperar acceso · DoraPass' };

export default function RecoveryPage() {
  return (
    <AuthShell title="Recupera tu acceso" description="Escribe el correo o WhatsApp asociado a tu cuenta.">
      <RecoveryForm />
    </AuthShell>
  );
}
