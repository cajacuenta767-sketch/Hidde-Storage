import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/admin-shell';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Panel administrador · DoraPass' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
