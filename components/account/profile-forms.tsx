'use client';

import { useActionState } from 'react';
import { LockKeyhole, Save, ShieldCheck } from 'lucide-react';

import { changePasswordAction, updateProfileAction } from '@/app/actions/account';
import { closeAllSessionsAction } from '@/app/actions/auth';
import { FieldError } from '@/components/auth/field-error';
import { initialAuthState } from '@/lib/auth/validation';

export function ProfileForms({
  fullName,
  email,
  phoneE164,
  marketCode,
}: {
  fullName: string;
  email: string;
  phoneE164: string;
  marketCode: 'PE' | 'BO';
}) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, initialAuthState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, initialAuthState);

  return (
    <div className="profile-grid">
      <form className="account-form-card" action={profileAction}>
        <div className="account-form-card__heading"><div><h2>Datos personales</h2><p>Información utilizada para identificar tus compras.</p></div></div>
        <label className="form-field"><span>Nombre completo</span><input name="fullName" defaultValue={fullName} required /><FieldError messages={profileState.fieldErrors?.fullName} /></label>
        <label className="form-field"><span>Correo electrónico</span><input value={email} disabled /><small>La modificación de correo requerirá verificación en una siguiente fase.</small></label>
        <div className="auth-two-columns">
          <label className="form-field"><span>WhatsApp</span><input value={phoneE164} disabled /></label>
          <label className="form-field"><span>País</span><input value={marketCode === 'PE' ? 'Perú' : 'Bolivia'} disabled /></label>
        </div>
        {profileState.message ? <div className={`form-message form-message--${profileState.status}`}>{profileState.message}</div> : null}
        <button className="account-button profile-submit" type="submit" disabled={profilePending}><Save /> {profilePending ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>

      <form className="account-form-card" action={passwordAction}>
        <div className="account-form-card__heading"><div><h2>Seguridad</h2><p>Cambia tu contraseña y protege tus sesiones.</p></div><ShieldCheck /></div>
        <label className="form-field"><span>Contraseña actual</span><div className="form-input-wrap"><LockKeyhole /><input name="currentPassword" type="password" autoComplete="current-password" required /></div><FieldError messages={passwordState.fieldErrors?.currentPassword} /></label>
        <label className="form-field"><span>Nueva contraseña</span><div className="form-input-wrap"><LockKeyhole /><input name="newPassword" type="password" minLength={8} autoComplete="new-password" required /></div><FieldError messages={passwordState.fieldErrors?.newPassword} /></label>
        <label className="form-field"><span>Confirmar nueva contraseña</span><div className="form-input-wrap"><LockKeyhole /><input name="newPasswordConfirmation" type="password" minLength={8} autoComplete="new-password" required /></div><FieldError messages={passwordState.fieldErrors?.newPasswordConfirmation} /></label>
        {passwordState.message ? <div className="form-message form-message--error">{passwordState.message}</div> : null}
        <button className="account-button profile-submit" type="submit" disabled={passwordPending}>{passwordPending ? 'Actualizando…' : 'Cambiar contraseña'}</button>
      </form>

      <form className="account-form-card account-form-card--sessions" action={closeAllSessionsAction}>
        <div><h2>Sesiones activas</h2><p>Cierra la sesión de todos los dispositivos conectados, incluido este.</p></div>
        <button className="account-button account-button--secondary" type="submit">Cerrar todas las sesiones</button>
      </form>
    </div>
  );
}
