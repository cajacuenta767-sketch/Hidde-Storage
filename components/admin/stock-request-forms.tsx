'use client';

import { BellRing, LoaderCircle, PackageX } from 'lucide-react';
import { useActionState } from 'react';

import {
  dismissStockRequestsAction,
  restockAndNotifyAction,
  type StockRestockState,
} from '@/app/actions/stock-requests';

const initialState: StockRestockState = { status: 'idle' };

export function RestockForm({
  offerVariantId,
  pendingCount,
}: {
  offerVariantId: number;
  pendingCount: number;
}) {
  const [state, action, pending] = useActionState(
    restockAndNotifyAction,
    initialState,
  );
  return (
    <form className="profile-inline-form" action={action}>
      <input type="hidden" name="offerVariantId" value={offerVariantId} />
      <label className="form-field">
        <span className="sr-only">Nuevo stock</span>
        <input
          name="stock"
          type="number"
          min={0}
          max={100000}
          step={1}
          defaultValue={Math.max(pendingCount, 1)}
          required
          disabled={pending}
        />
      </label>
      <button
        className="inventory-small-button"
        type="submit"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="spin" /> : <BellRing />}
        {pending ? 'Actualizando…' : 'Actualizar stock y avisar'}
      </button>
      {state.message ? (
        <div
          className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`}
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}

export function DismissStockRequestsForm({
  offerVariantId,
}: {
  offerVariantId: number;
}) {
  return (
    <details className="inventory-action-details">
      <summary>
        <PackageX /> Descartar solicitudes
      </summary>
      <form action={dismissStockRequestsAction}>
        <input type="hidden" name="offerVariantId" value={offerVariantId} />
        <p className="admin-form-note">
          Las solicitudes pendientes de esta opción se marcarán como
          descartadas y no se avisará a los clientes.
        </p>
        <button
          className="inventory-small-button inventory-small-button--danger"
          type="submit"
        >
          <PackageX /> Confirmar descarte
        </button>
      </form>
    </details>
  );
}
