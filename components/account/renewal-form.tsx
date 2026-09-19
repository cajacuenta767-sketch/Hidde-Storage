'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { createRenewalRequestAction, type RenewalActionState } from '@/app/actions/account';

type RenewalOption = {
  id: number;
  durationMonths: number;
  price: number;
  regularPrice: number;
  discountPercent: number;
};

const initialState: RenewalActionState = { status: 'idle' };

export function RenewalForm({
  subscriptionId,
  currency,
  marketCode,
  options,
}: {
  subscriptionId: number;
  currency: 'PEN' | 'BOB';
  marketCode: 'PE' | 'BO';
  options: RenewalOption[];
}) {
  const [state, action, pending] = useActionState(createRenewalRequestAction, initialState);
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? 0);
  const money = new Intl.NumberFormat(marketCode === 'PE' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  const selected = options.find((option) => option.id === selectedId) ?? options[0];

  if (!selected) return <p className="account-empty-inline">No hay una renovación disponible para esta modalidad.</p>;

  return (
    <form className="renewal-form" action={action}>
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="offerVariantId" value={selected.id} />
      <div className="renewal-options">
        {options.map((option) => (
          <button
            className={option.id === selected.id ? 'renewal-option renewal-option--active' : 'renewal-option'}
            type="button"
            key={option.id}
            onClick={() => setSelectedId(option.id)}
          >
            <span>{option.durationMonths} {option.durationMonths === 1 ? 'mes' : 'meses'}</span>
            <strong>{money.format(option.price)}</strong>
            {option.discountPercent > 0 ? <small>Ahorras {option.discountPercent.toFixed(2)}%</small> : <small>Precio mensual</small>}
          </button>
        ))}
      </div>
      <div className="renewal-summary">
        <div><span>Precio regular</span><strong>{money.format(selected.regularPrice)}</strong></div>
        <div><span>Descuento</span><strong>{selected.discountPercent.toFixed(2)}%</strong></div>
        <div className="renewal-summary__total"><span>Total de renovación</span><strong>{money.format(selected.price)}</strong></div>
      </div>
      {state.message ? <div className={`renewal-message renewal-message--${state.status}`}>{state.status === 'success' ? <CheckCircle2 /> : null}{state.message}</div> : null}
      <button className="account-button renewal-submit" type="submit" disabled={pending}>
        {pending ? 'Preparando renovación…' : 'Preparar renovación'} <ArrowRight />
      </button>
      <small className="renewal-note">No perderás los días que todavía tienes. La fecha se ampliará después de confirmar el pago.</small>
    </form>
  );
}
