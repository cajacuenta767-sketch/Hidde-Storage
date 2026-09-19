'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';

import { resetPasswordAction } from '@/app/actions/auth';
import { FieldError } from '@/components/auth/field-error';
import { initialAuthState } from '@/lib/auth/validation';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialAuthState);
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="token" value={token} />
      {state.message ? <div className="form-message form-message--error" role="alert">{state.message}</div> : null}
      <FieldError messages={state.fieldErrors?.token} />
      <label className="form-field">
        <span>Nueva contraseña</span>
        <div className="form-input-wrap"><LockKeyhole /><input name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
        <FieldError messages={state.fieldErrors?.password} />
      </label>
      <label className="form-field">
        <span>Confirmar nueva contraseña</span>
        <div className="form-input-wrap"><LockKeyhole /><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required /></div>
        <FieldError messages={state.fieldErrors?.passwordConfirmation} />
      </label>
      <button className="auth-submit" type="submit" disabled={pending || !token}>{pending ? 'Actualizando…' : 'Guardar contraseña'} <ArrowRight /></button>
      {!token ? <p className="auth-switch">Este enlace no contiene un token válido. <Link href="/recuperar-contrasena">Solicitar otro</Link></p> : null}
    </form>
  );
}
