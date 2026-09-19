import { Marketplace } from '@/components/marketplace/marketplace';
import { getCurrentCustomer } from '@/lib/auth/session';
import { getCatalog } from '@/lib/catalog';
import { getMarketplaceRails } from '@/lib/marketplace-rails';
import { getActivePromotions } from '@/lib/promotions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [catalog, customer, promotions, rails] = await Promise.all([
    getCatalog(),
    getCurrentCustomer(),
    getActivePromotions(),
    getMarketplaceRails(),
  ]);

  return (
    <Marketplace
      categories={catalog.categories}
      products={catalog.products}
      promotions={promotions}
      rails={rails}
      whatsappNumber={process.env.DORAPASS_WHATSAPP_NUMBER ?? '51972262984'}
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
