import { Marketplace } from '@/components/marketplace/marketplace';
import { getCurrentCustomer } from '@/lib/auth/session';
import { getCatalog } from '@/lib/catalog';
import { getActivePromotions } from '@/lib/promotions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [catalog, customer, promotions] = await Promise.all([
    getCatalog(),
    getCurrentCustomer(),
    getActivePromotions(),
  ]);

  return (
    <Marketplace
      categories={catalog.categories}
      products={catalog.products}
      promotions={promotions}
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
