'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';

import { loginAction } from '@/app/actions/auth';
import { FieldError } from '@/components/auth/field-error';
import { initialAuthState } from '@/lib/auth/validation';

export function LoginForm({ nextPath, passwordUpdated }: { nextPath: string; passwordUpdated: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initialAuthState);

  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="next" value={nextPath} />
      {passwordUpdated ? <div className="form-message form-message--success">Tu contraseña fue actualizada. Ingresa nuevamente.</div> : null}
      {state.message ? <div className="form-message form-message--error" role="alert">{state.message}</div> : null}

      <label className="form-field">
        <span>Correo o número de WhatsApp</span>
        <div className="form-input-wrap"><Mail /><input name="identifier" autoComplete="username" placeholder="correo@ejemplo.com o +591…" required /></div>
        <FieldError messages={state.fieldErrors?.identifier} />
      </label>

      <label className="form-field">
        <span>Contraseña</span>
        <div className="form-input-wrap"><LockKeyhole /><input name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required /></div>
        <FieldError messages={state.fieldErrors?.password} />
      </label>

      <div className="auth-form-meta"><Link href="/recuperar-contrasena">Olvidé mi contraseña</Link></div>
      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? 'Ingresando…' : 'Ingresar'} <ArrowRight />
      </button>
      <p className="auth-switch">¿Todavía no tienes cuenta? <Link href="/registro">Crear mi cuenta</Link></p>
    </form>
  );
}
