import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CreateServiceAccountForm } from '@/components/admin/create-service-account-form';
import { getInventoryProductOptions } from '@/lib/admin/inventory-data';

export default async function NewInventoryAccountPage() {
  const products = await getInventoryProductOptions();
  return (
    <div className="account-page admin-page inventory-page">
      <Link className="admin-back-link" href="/admin/inventario"><ArrowLeft /> Volver al inventario</Link>
      <header className="account-page-header"><div><h1>Nueva cuenta</h1><p>Crea la cuenta maestra y genera sus perfiles disponibles en un solo paso.</p></div></header>
      <CreateServiceAccountForm products={products} />
    </div>
  );
}
