'use client';

import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';

import {
  revealCredentialAction,
  type RevealCredentialState,
} from '@/app/actions/inventory';

const initialState: RevealCredentialState = { status: 'idle' };

export function RevealSecret({
  accountId,
  profileId,
  secretType,
  label,
  maskedValue,
}: {
  accountId: number;
  profileId?: number;
  secretType: 'provider_email' | 'provider_password' | 'profile_pin';
  label: string;
  maskedValue: string;
}) {
  const [state, action, pending] = useActionState(revealCredentialAction, initialState);
  const [hiddenReveal, setHiddenReveal] = useState(0);
  const visible = Boolean(
    state.status === 'success' &&
    state.value &&
    state.revealedAt &&
    hiddenReveal !== state.revealedAt,
  );

  useEffect(() => {
    if (state.status !== 'success' || !state.value || !state.revealedAt) return;
    const timeout = window.setTimeout(() => setHiddenReveal(state.revealedAt ?? 0), 30_000);
    return () => window.clearTimeout(timeout);
  }, [state.revealedAt, state.status, state.value]);

  return (
    <div className="protected-secret">
      <div className="protected-secret__value">
        <span><KeyRound /> {label}</span>
        <strong>{visible && state.value ? state.value : maskedValue}</strong>
        {visible ? <small><ShieldCheck /> Se ocultará automáticamente en 30 segundos</small> : null}
      </div>
      <details className="protected-secret__reveal">
        <summary>{visible ? <EyeOff /> : <Eye />}{visible ? 'Ocultar' : 'Revelar'}</summary>
        <form action={action}>
          <input type="hidden" name="accountId" value={accountId} />
          {profileId ? <input type="hidden" name="profileId" value={profileId} /> : null}
          <input type="hidden" name="secretType" value={secretType} />
          <label className="form-field"><span>Tu contraseña de administrador</span><input name="adminPassword" type="password" autoComplete="current-password" required /></label>
          <label className="form-field"><span>Motivo de consulta</span><input name="reason" minLength={4} maxLength={200} placeholder="Ej. atender acceso del cliente" required /></label>
          {state.message ? <div className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</div> : null}
          <button className="inventory-small-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Eye />}{pending ? 'Verificando…' : 'Mostrar credencial'}</button>
        </form>
      </details>
    </div>
  );
}
