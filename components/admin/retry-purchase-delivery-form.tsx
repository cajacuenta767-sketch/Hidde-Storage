'use client';

import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useActionState } from 'react';

import {
  retryPurchaseDeliveryAction,
  type PurchaseConfirmationState,
} from '@/app/actions/purchase-orders';

const initialState: PurchaseConfirmationState = { status: 'idle' };

export function RetryPurchaseDeliveryForm({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState(
    retryPurchaseDeliveryAction,
    initialState,
  );

  return (
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
        {pending ? <LoaderCircle className="spin" /> : <RefreshCw />}
        {pending ? 'Buscando perfil…' : 'Reintentar asignación'}
      </button>
    </form>
  );
}
