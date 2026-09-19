import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  Mail,
  MessageCircle,
  UserRound,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { ConfirmPurchaseForm } from '@/components/admin/confirm-purchase-form';
import { DeliveryTokenForm } from '@/components/admin/delivery-token-form';
import { RetryPurchaseDeliveryForm } from '@/components/admin/retry-purchase-delivery-form';
import { getAdminPurchaseOrder } from '@/lib/admin/purchase-orders';
import { formatAdminDate, formatAdminMoney } from '@/lib/admin/presentation';

const statusLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  payment_review: 'Pago en revisión',
  paid: 'Pagado',
  token_issued: 'Token emitido',
  fulfilling: 'Preparando acceso',
  delivered: 'Entregado',
  expired: 'Vencido',
  failed: 'Fallido',
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  if (!/^DP-\d{8}-[A-F0-9]{8}$/.test(publicId)) notFound();
  const order = await getAdminPurchaseOrder(publicId);
  if (!order) notFound();
  const canConfirm =
    order.provider === 'manual' &&
    ['pending_payment', 'payment_review'].includes(order.status);
  const canIssueToken = ['paid', 'token_issued'].includes(order.status);
  const canRetryInventory = order.status === 'fulfilling';

  return (
    <div className="account-page admin-page">
      <Link className="admin-back-link" href="/admin/pedidos">
        <ArrowLeft /> Volver a pedidos
      </Link>
      <header className="subscription-detail-header admin-detail-header">
        <div>
          <small>Compra {order.publicId}</small>
          <h1>{order.items.map((item) => item.serviceName).join(', ')}</h1>
          <p>Creada el {formatAdminDate(order.createdAt, true)}.</p>
        </div>
        <span className="status-badge status-badge--info">
          {statusLabels[order.status] ?? order.status}
        </span>
      </header>
      <section className="admin-order-overview">
        <div className="subscription-detail-product">
          <span>
            <Image
              src={order.items[0].imagePath}
              alt={order.items[0].imageAlt}
              width={90}
              height={70}
            />
          </span>
          <div>
            <strong>
              {order.items.length}{' '}
              {order.items.length === 1 ? 'producto' : 'productos'}
            </strong>
            <small>
              {order.paymentMethodCode} ·{' '}
              {order.marketCode === 'PE' ? 'Perú' : 'Bolivia'}
            </small>
          </div>
        </div>
        <div className="admin-order-total">
          <span>Total a validar</span>
          <strong>
            {formatAdminMoney(order.totalAmountMinor, order.currency)}
          </strong>
        </div>
      </section>
      <div className="subscription-detail-columns admin-detail-columns">
        <section className="subscription-detail-section">
          <h2>Cliente</h2>
          <div className="admin-info-list">
            <div>
              <UserRound />
              <span>Nombre</span>
              <strong>{order.customerName}</strong>
            </div>
            <div>
              <Mail />
              <span>Correo</span>
              <strong>{order.customerEmail}</strong>
            </div>
            <div>
              <MessageCircle />
              <span>WhatsApp</span>
              <strong>{order.customerPhone}</strong>
            </div>
            <div>
              <CreditCard />
              <span>Pago</span>
              <strong>Gestión directa por WhatsApp</strong>
            </div>
          </div>
        </section>
        <section className="subscription-detail-section">
          <h2>Productos</h2>
          <div className="admin-info-list">
            {order.items.map((item) => (
              <div key={item.id}>
                <CreditCard />
                <span>{item.serviceName}</span>
                <strong>
                  {item.planName} · {item.durationMonths} mes(es)
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="subscription-detail-section admin-review-section">
        <div>
          <h2>{canConfirm ? 'Confirmación manual' : 'Estado del pago'}</h2>
          <p>
            {canConfirm
              ? 'Verifica el abono en tu banco antes de confirmar. La acción crea las suscripciones y asigna los perfiles disponibles.'
              : `El pedido está en estado: ${statusLabels[order.status] ?? order.status}.`}
          </p>
        </div>
        {canConfirm ? <ConfirmPurchaseForm publicId={order.publicId} /> : null}
      </section>
      {canRetryInventory ? (
        <section className="subscription-detail-section admin-review-section">
          <div>
            <h2>Acceso pendiente de inventario</h2>
            <p>
              Libera reservas vencidas y vuelve a buscar automáticamente una
              cuenta o perfil compatible. No vuelve a registrar el pago.
            </p>
          </div>
          <RetryPurchaseDeliveryForm publicId={order.publicId} />
        </section>
      ) : null}
      {canIssueToken ? (
        <section className="subscription-detail-section admin-review-section">
          <div>
            <h2>Token de entrega</h2>
            <p>
              Genera el token solo después de confirmar el pago. Vence en 30
              minutos, admite 5 intentos y queda ligado a este pedido.
            </p>
            {order.deliveryToken ? (
              <small>
                Hay un token activo · {order.deliveryToken.attempts}/
                {order.deliveryToken.maxAttempts} intentos usados · vence el{' '}
                {formatAdminDate(order.deliveryToken.expiresAt, true)}
              </small>
            ) : null}
          </div>
          <DeliveryTokenForm
            publicId={order.publicId}
            customerPhone={order.customerPhone}
          />
        </section>
      ) : null}
    </div>
  );
}
