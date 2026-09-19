'use client';

import { Copy, KeyRound, LoaderCircle, MessageCircle } from 'lucide-react';
import { useActionState, useState } from 'react';

import {
  issueDeliveryTokenAction,
  type DeliveryTokenState,
} from '@/app/actions/purchase-orders';

const initialState: DeliveryTokenState = { status: 'idle' };

export function DeliveryTokenForm({
  publicId,
  customerPhone,
}: {
  publicId: string;
  customerPhone: string;
}) {
  const [state, action, pending] = useActionState(
    issueDeliveryTokenAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const message = state.token
    ? `Hola, tu pago del pedido ${publicId} fue confirmado. Tu token de entrega DoraPass es: ${state.token}. Escríbelo en la página de tu pedido. Vence en 30 minutos y solo se puede usar una vez.`
    : '';
  const whatsappUrl = state.token
    ? `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    : '';

  async function copyToken() {
    if (!state.token) return;
    await navigator.clipboard.writeText(state.token);
    setCopied(true);
  }

  return (
    <div className="delivery-token-admin">
      <form className="admin-confirm-form" action={action}>
        <input type="hidden" name="publicId" value={publicId} />
        {state.message ? (
          <p
            className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`}
          >
            {state.message}
          </p>
        ) : null}
        <button className="account-button" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" /> : <KeyRound />}
          {pending ? 'Generando…' : 'Generar nuevo token'}
        </button>
      </form>
      {state.token ? (
        <div className="delivery-token-result">
          <small>Token de un solo uso</small>
          <strong>{state.token}</strong>
          <div>
            <button
              className="account-button account-button--secondary"
              type="button"
              onClick={copyToken}
            >
              <Copy /> {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a
              className="account-button"
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Enviar por WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
