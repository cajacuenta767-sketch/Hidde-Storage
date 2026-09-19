'use client';

import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import {
  confirmRenewalPaymentAction,
  type AdminActionState,
} from '@/app/actions/admin';

const initialAdminActionState: AdminActionState = { status: 'idle' };

export function ConfirmPaymentForm({
  requestId,
  detailed = false,
}: {
  requestId: number;
  detailed?: boolean;
}) {
  const [state, action, pending] = useActionState(
    confirmRenewalPaymentAction,
    initialAdminActionState,
  );

  return (
    <form className={detailed ? 'admin-confirm-form' : 'admin-confirm-form admin-confirm-form--compact'} action={action}>
      <input type="hidden" name="requestId" value={requestId} />
      {detailed ? (
        <label className="form-field">
          <span>Nota interna opcional</span>
          <textarea
            name="reviewNote"
            maxLength={300}
            placeholder="Ejemplo: comprobante Yape validado"
          />
        </label>
      ) : null}
      {state.message ? (
        <div
          className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`}
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          {state.message}
        </div>
      ) : null}
      <button className="account-button" type="submit" disabled={pending || state.status === 'success'}>
        <CheckCircle2 /> {pending ? 'Confirmando…' : state.status === 'success' ? 'Pago confirmado' : 'Confirmar pago'}
      </button>
    </form>
  );
}
