import { notFound } from 'next/navigation';

import { OrderDelivery } from '@/components/orders/order-delivery';
import { requireCustomer } from '@/lib/auth/session';
import { getCustomerOrder } from '@/lib/orders/status';

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const customer = await requireCustomer();
  const { publicId } = await params;
  if (!/^DP-\d{8}-[A-F0-9]{8}$/.test(publicId)) notFound();
  const order = await getCustomerOrder(customer.id, publicId);
  if (!order) notFound();

  const money = new Intl.NumberFormat(order.marketCode === 'PE' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency: order.currency,
    maximumFractionDigits: 0,
  });
  const products = order.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.serviceName} — ${item.planName}\n` +
        `   ${item.accessTypeCode === 'PROFILE' ? 'Perfil' : 'Cuenta completa'} · ${item.durationMonths} mes(es) · ${money.format(item.amountMinor / 100)}`,
    )
    .join('\n\n');
  const message =
    `Hola DoraPass, quiero completar esta compra:\n\n` +
    `Pedido: ${order.orderId}\nPaís: ${order.marketCode === 'PE' ? 'Perú' : 'Bolivia'}\n\n` +
    `${products}\n\nTotal: ${money.format(order.amountMinor / 100)}\n\n` +
    `Por favor, envíenme el QR o los datos para pagar.`;
  const number = (process.env.DORAPASS_WHATSAPP_NUMBER ?? '51972262984').replace(/\D/g, '');

  return (
    <OrderDelivery
      publicId={order.orderId}
      status={order.status}
      whatsappUrl={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      supportUrl={`https://wa.me/${number}?text=${encodeURIComponent(`Hola DoraPass, necesito ayuda con mi pedido ${order.orderId}.`)}`}
    />
  );
}
