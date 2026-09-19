'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight, LockKeyhole, Mail, MessageCircle, UserRound } from 'lucide-react';

import { registerAction } from '@/app/actions/auth';
import { FieldError } from '@/components/auth/field-error';
import { initialAuthState } from '@/lib/auth/validation';

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialAuthState);

  return (
    <form className="auth-form" action={action}>
      {state.message ? <div className="form-message form-message--error" role="alert">{state.message}</div> : null}

      <label className="form-field">
        <span>Nombre completo</span>
        <div className="form-input-wrap"><UserRound /><input name="fullName" autoComplete="name" placeholder="Cómo quieres que te llamemos" required /></div>
        <FieldError messages={state.fieldErrors?.fullName} />
      </label>

      <div className="auth-two-columns">
        <label className="form-field">
          <span>País</span>
          <select name="marketCode" defaultValue="BO" required>
            <option value="BO">Bolivia (+591)</option>
            <option value="PE">Perú (+51)</option>
          </select>
          <FieldError messages={state.fieldErrors?.marketCode} />
        </label>
        <label className="form-field">
          <span>WhatsApp</span>
          <div className="form-input-wrap"><MessageCircle /><input name="phone" inputMode="tel" autoComplete="tel" placeholder="Tu número" required /></div>
          <FieldError messages={state.fieldErrors?.phone} />
        </label>
      </div>

      <label className="form-field">
        <span>Correo electrónico</span>
        <div className="form-input-wrap"><Mail /><input name="email" type="email" autoComplete="email" placeholder="correo@ejemplo.com" required /></div>
        <FieldError messages={state.fieldErrors?.email} />
      </label>

      <div className="auth-two-columns">
        <label className="form-field">
          <span>Contraseña</span>
          <div className="form-input-wrap"><LockKeyhole /><input name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" minLength={8} required /></div>
          <FieldError messages={state.fieldErrors?.password} />
        </label>
        <label className="form-field">
          <span>Confirmar contraseña</span>
          <div className="form-input-wrap"><LockKeyhole /><input name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" minLength={8} required /></div>
          <FieldError messages={state.fieldErrors?.passwordConfirmation} />
        </label>
      </div>

      <label className="auth-terms">
        <input name="terms" type="checkbox" required />
        <span>Acepto los <Link href="/terminos">términos de compra</Link> y la <Link href="/privacidad">política de privacidad</Link>.</span>
      </label>
      <FieldError messages={state.fieldErrors?.terms} />

      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? 'Creando tu cuenta…' : 'Crear mi cuenta'} <ArrowRight />
      </button>
      <p className="auth-switch">¿Ya tienes una cuenta? <Link href="/ingresar">Ingresar</Link></p>
    </form>
  );
}
