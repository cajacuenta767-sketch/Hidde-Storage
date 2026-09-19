import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';

import { requireCustomer } from '@/lib/auth/session';
import { getCustomerPurchaseOrders } from '@/lib/orders/status';
import { getCustomerRenewalRequests } from '@/lib/subscriptions/data';
import { formatCustomerDate } from '@/lib/subscriptions/dates';

const requestLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  payment_review: 'Comprobante en revisión',
  approved: 'Renovación aprobada',
  cancelled: 'Cancelada',
};

const purchaseLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  payment_review: 'Pago en revisión',
  paid: 'Pago confirmado',
  token_issued: 'Token listo',
  fulfilling: 'Preparando acceso',
  delivered: 'Entregado',
  expired: 'Vencido',
  cancelled: 'Cancelado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
};

export default async function OrdersPage() {
  const customer = await requireCustomer();
  const [purchases, requests] = await Promise.all([
    getCustomerPurchaseOrders(customer.id),
    getCustomerRenewalRequests(customer.id),
  ]);
  return (
    <div className="account-page">
      <header className="account-page-header">
        <div>
          <h1>Mis pedidos</h1>
          <p>Solicitudes de renovación y compras vinculadas a tu cuenta.</p>
        </div>
      </header>
      {purchases.length || requests.length ? (
        <div className="order-list">
          {purchases.map((purchase) => {
            const money = new Intl.NumberFormat(
              purchase.marketCode === 'PE' ? 'es-PE' : 'es-BO',
              {
                style: 'currency',
                currency: purchase.currency,
                maximumFractionDigits: 0,
              },
            );
            const firstSubscription = purchase.items.find(
              (item) => item.subscriptionId,
            )?.subscriptionId;
            return (
              <article className="order-row" key={purchase.publicId}>
                <span className="order-logo">
                  <Image
                    src={purchase.imagePath}
                    alt={purchase.imageAlt}
                    width={70}
                    height={52}
                  />
                </span>
                <div className="order-main">
                  <small>Compra {purchase.publicId}</small>
                  <strong>
                    {purchase.items.map((item) => item.serviceName).join(', ')}
                  </strong>
                  <span>
                    {purchase.items.length}{' '}
                    {purchase.items.length === 1 ? 'producto' : 'productos'} ·{' '}
                    {purchase.marketCode === 'PE' ? 'Perú' : 'Bolivia'}
                  </span>
                </div>
                <span className="status-badge status-badge--info">
                  {purchaseLabels[purchase.status] ?? purchase.status}
                </span>
                <strong className="order-price">
                  {money.format(purchase.totalAmountMinor / 100)}
                </strong>
                {purchase.status !== 'delivered' ? (
                  <Link
                    className="account-button account-button--secondary"
                    href={`/pedido/${purchase.publicId}`}
                  >
                    Continuar <ArrowRight />
                  </Link>
                ) : firstSubscription ? (
                  <Link
                    className="account-button account-button--secondary"
                    href={`/mi-cuenta/suscripciones/${firstSubscription}`}
                  >
                    Ver acceso <ArrowRight />
                  </Link>
                ) : (
                  <Link
                    className="account-button account-button--secondary"
                    href="/"
                  >
                    Volver al catálogo
                  </Link>
                )}
              </article>
            );
          })}
          {requests.map((request) => {
            const money = new Intl.NumberFormat(
              customer.marketCode === 'PE' ? 'es-PE' : 'es-BO',
              {
                style: 'currency',
                currency: request.currency,
                maximumFractionDigits: 0,
              },
            );
            return (
              <article className="order-row" key={request.id}>
                <span className="order-logo">
                  <Image
                    src={request.imagePath}
                    alt={request.imageAlt}
                    width={70}
                    height={52}
                  />
                </span>
                <div className="order-main">
                  <small>
                    Renovación DP-{String(request.id).padStart(6, '0')}
                  </small>
                  <strong>
                    {request.serviceName} · {request.planName}
                  </strong>
                  <span>
                    Nueva fecha estimada:{' '}
                    {formatCustomerDate(
                      request.proposedExpiresAt,
                      customer.marketCode,
                    )}
                  </span>
                </div>
                <span className="status-badge status-badge--info">
                  {requestLabels[request.status] ?? request.status}
                </span>
                <strong className="order-price">
                  {money.format(request.priceMinor / 100)}
                </strong>
                <Link
                  className="account-button account-button--secondary"
                  href={`/mi-cuenta/suscripciones/${request.subscriptionId}`}
                >
                  Ver <ArrowRight />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="account-empty">
          <ShoppingBag />
          <h2>No tienes pedidos todavía</h2>
          <p>Las solicitudes de compra y renovación aparecerán aquí.</p>
          <Link className="account-button" href="/">
            Explorar catálogo
          </Link>
        </div>
      )}
    </div>
  );
}
