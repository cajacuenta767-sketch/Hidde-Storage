import { Marketplace } from '@/components/marketplace/marketplace';
import { getCurrentCustomer } from '@/lib/auth/session';
import { getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [catalog, customer] = await Promise.all([
    getCatalog(),
    getCurrentCustomer(),
  ]);

  return (
    <Marketplace
      categories={catalog.categories}
      products={catalog.products}
      viewer={
        customer
          ? {
              firstName: customer.firstName,
              initials: customer.initials,
              role: customer.role,
            }
          : null
      }
    />
  );
}
