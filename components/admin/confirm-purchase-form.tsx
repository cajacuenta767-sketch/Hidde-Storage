'use client';

import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useActionState } from 'react';

import {
  confirmPurchasePaymentAction,
  type PurchaseConfirmationState,
} from '@/app/actions/purchase-orders';

const initialState: PurchaseConfirmationState = { status: 'idle' };

export function ConfirmPurchaseForm({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState(
    confirmPurchasePaymentAction,
    initialState,
  );
  return (
    <form className="admin-confirm-form" action={action}>
      <input type="hidden" name="publicId" value={publicId} />
      <label>
        <span>Nota interna opcional</span>
        <input
          name="reviewNote"
          maxLength={300}
          placeholder="Ej. verificado en el banco"
        />
      </label>
      {state.message ? (
        <p
          className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`}
        >
          {state.message}
        </p>
      ) : null}
      <button className="account-button" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" /> : <CheckCircle2 />}
        {pending ? 'Confirmando…' : 'Confirmar pago recibido'}
      </button>
    </form>
  );
}
