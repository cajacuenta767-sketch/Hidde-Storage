import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CreditCard, Mail, MessageCircle, UserRound } from 'lucide-react';
import { notFound } from 'next/navigation';

import { ConfirmPaymentForm } from '@/components/admin/confirm-payment-form';
import { getAdminRenewalRequest } from '@/lib/admin/data';
import {
  formatAdminDate,
  formatAdminMoney,
  renewalStatusMeta,
} from '@/lib/admin/presentation';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const requestId = Number((await params).id);
  if (!Number.isSafeInteger(requestId) || requestId < 1) notFound();

  const request = await getAdminRenewalRequest(requestId);
  if (!request) notFound();
  const status = renewalStatusMeta[request.status] ?? { label: request.status, tone: 'muted' as const };
  const canConfirm = request.status === 'pending_payment' || request.status === 'payment_review';

  return (
    <div className="account-page admin-page">
      <Link className="admin-back-link" href="/admin/pedidos"><ArrowLeft /> Volver a pedidos</Link>
      <header className="subscription-detail-header admin-detail-header">
        <div>
          <small>Pedido DP-{String(request.id).padStart(6, '0')}</small>
          <h1>{request.serviceName}</h1>
          <p>Solicitud de renovación creada el {formatAdminDate(request.createdAt, true)}.</p>
        </div>
        <span className={`status-badge status-badge--${status.tone}`}>{status.label}</span>
      </header>

      <section className="admin-order-overview">
        <div className="subscription-detail-product">
          <span><Image src={request.imagePath} alt={request.imageAlt} width={90} height={70} /></span>
          <div><strong>{request.serviceName} · {request.planName}</strong><small>{request.accessTypeName} · {request.durationMonths} meses</small></div>
        </div>
        <div className="admin-order-total"><span>Total a validar</span><strong>{formatAdminMoney(request.priceMinor, request.currency)}</strong></div>
      </section>

      <div className="subscription-detail-columns admin-detail-columns">
        <section className="subscription-detail-section">
          <h2>Cliente</h2>
          <div className="admin-info-list">
            <div><UserRound /><span>Nombre</span><strong>{request.customerName}</strong></div>
            <div><Mail /><span>Correo</span><strong>{request.customerEmail}</strong></div>
            <div><MessageCircle /><span>WhatsApp</span><strong>{request.customerPhone}</strong></div>
            <div><CreditCard /><span>País</span><strong>{request.marketCode === 'PE' ? 'Perú' : 'Bolivia'}</strong></div>
          </div>
        </section>

        <section className="subscription-detail-section">
          <h2>Fechas de renovación</h2>
          <div className="admin-info-list">
            <div><CalendarDays /><span>Vencimiento anterior</span><strong>{formatAdminDate(request.baseExpiresAt)}</strong></div>
            <div><CalendarDays /><span>Inicio propuesto</span><strong>{formatAdminDate(request.proposedStartDate)}</strong></div>
            <div><CalendarDays /><span>Nuevo vencimiento</span><strong>{formatAdminDate(request.proposedExpiresAt)}</strong></div>
            <div><CreditCard /><span>Duración</span><strong>{request.durationMonths} meses</strong></div>
          </div>
        </section>
      </div>

      <section className="subscription-detail-section admin-review-section">
        <div><h2>{canConfirm ? 'Confirmación manual' : 'Revisión completada'}</h2><p>{canConfirm ? 'Verifica primero el abono en el banco o billetera correspondiente. Al confirmar, la fecha y la garantía se actualizarán automáticamente.' : request.reviewNote || 'Este pedido ya fue procesado y quedó registrado en auditoría.'}</p></div>
        {canConfirm ? <ConfirmPaymentForm requestId={request.id} detailed /> : <span className={`status-badge status-badge--${status.tone}`}>{status.label}</span>}
      </section>
    </div>
  );
}
