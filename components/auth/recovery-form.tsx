'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

import { requestPasswordResetAction } from '@/app/actions/auth';
import { FieldError } from '@/components/auth/field-error';
import { initialAuthState } from '@/lib/auth/validation';

export function RecoveryForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialAuthState);
  return (
    <form className="auth-form" action={action}>
      {state.message ? <output className={`form-message form-message--${state.status}`}>{state.message}</output> : null}
      <label className="form-field">
        <span>Correo o número de WhatsApp</span>
        <div className="form-input-wrap"><Mail /><input name="identifier" autoComplete="username" placeholder="Tu correo o WhatsApp" required /></div>
        <FieldError messages={state.fieldErrors?.identifier} />
      </label>
      <button className="auth-submit" type="submit" disabled={pending}>{pending ? 'Preparando…' : 'Recuperar acceso'} <ArrowRight /></button>
      <p className="auth-switch"><Link href="/ingresar">Volver a iniciar sesión</Link></p>
    </form>
  );
}
