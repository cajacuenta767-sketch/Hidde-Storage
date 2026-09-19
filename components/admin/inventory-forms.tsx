'use client';

import { AlertTriangle, CheckCircle2, Inbox, KeyRound, LoaderCircle, LogOut, Save, UserRoundPlus } from 'lucide-react';
import { useActionState, useState } from 'react';

import {
  assignProfileAction,
  openIncidentAction,
  releaseProfileAction,
  resolveIncidentAction,
  updateTotpSecretAction,
  updateEmailOtpAction,
  type InventoryActionState,
} from '@/app/actions/inventory';

const initialState: InventoryActionState = { status: 'idle' };

function ActionMessage({ state }: { state: InventoryActionState }) {
  if (!state.message) return null;
  return <div className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</div>;
}

export function AssignProfileForm({
  profileId,
  candidates,
}: {
  profileId: number;
  candidates: Array<{
    subscriptionId: number;
    customerName: string;
    customerEmail: string;
    marketCode: string;
    expiresAt: string;
  }>;
}) {
  const [state, action, pending] = useActionState(assignProfileAction, initialState);
  return (
    <form className="profile-inline-form" action={action}>
      <input type="hidden" name="profileId" value={profileId} />
      <select name="subscriptionId" required defaultValue="" disabled={pending || candidates.length === 0}>
        <option value="" disabled>{candidates.length > 0 ? 'Seleccionar cliente activo' : 'No hay suscripciones disponibles'}</option>
        {candidates.map((candidate) => <option key={candidate.subscriptionId} value={candidate.subscriptionId}>{candidate.customerName} · {candidate.marketCode === 'PE' ? 'Perú' : 'Bolivia'} · vence {candidate.expiresAt}</option>)}
      </select>
      <button className="inventory-small-button" type="submit" disabled={pending || candidates.length === 0}>{pending ? <LoaderCircle className="spin" /> : <UserRoundPlus />}{pending ? 'Asignando…' : 'Asignar'}</button>
      <ActionMessage state={state} />
    </form>
  );
}

export function ReleaseProfileForm({ assignmentId }: { assignmentId: number }) {
  const [state, action, pending] = useActionState(releaseProfileAction, initialState);
  return (
    <details className="inventory-action-details">
      <summary><LogOut /> Liberar perfil</summary>
      <form action={action}>
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <label className="form-field"><span>Motivo</span><input name="reason" minLength={3} maxLength={300} placeholder="Ej. plan finalizado" required /></label>
        <ActionMessage state={state} />
        <button className="inventory-small-button inventory-small-button--danger" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <LogOut />}{pending ? 'Liberando…' : 'Confirmar liberación'}</button>
      </form>
    </details>
  );
}

export function OpenIncidentForm({ accountId, profiles }: { accountId: number; profiles: Array<{ id: number; displayName: string }> }) {
  const [state, action, pending] = useActionState(openIncidentAction, initialState);
  return (
    <form className="incident-create-form" action={action}>
      <input type="hidden" name="accountId" value={accountId} />
      <div className="inventory-form-grid">
        <label className="form-field"><span>Tipo</span><select name="incidentType" defaultValue="provider_access"><option value="provider_access">Acceso del proveedor</option><option value="customer_access">Acceso del cliente</option><option value="profile_pin">PIN de perfil</option><option value="renewal">Renovación</option><option value="other">Otro</option></select></label>
        <label className="form-field"><span>Perfil afectado</span><select name="profileId" defaultValue=""><option value="">Cuenta completa</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></label>
        <label className="form-field"><span>Prioridad</span><select name="priority" defaultValue="medium"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
        <label className="form-field inventory-form-grid__wide"><span>Título</span><input name="title" minLength={4} maxLength={120} placeholder="Resumen del problema" required /></label>
        <label className="form-field inventory-form-grid__wide"><span>Descripción</span><textarea name="description" minLength={8} maxLength={1000} placeholder="Qué ocurrió, desde cuándo y a quién afecta" required /></label>
      </div>
      <ActionMessage state={state} />
      <button className="account-button account-button--secondary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <AlertTriangle />}{pending ? 'Registrando…' : 'Registrar incidencia'}</button>
    </form>
  );
}

export function ResolveIncidentForm({ incidentId }: { incidentId: number }) {
  const [state, action, pending] = useActionState(resolveIncidentAction, initialState);
  return (
    <details className="inventory-action-details inventory-action-details--resolve">
      <summary><CheckCircle2 /> Marcar resuelta</summary>
      <form action={action}>
        <input type="hidden" name="incidentId" value={incidentId} />
        <label className="form-field"><span>Solución aplicada</span><textarea name="resolutionNote" minLength={5} maxLength={600} placeholder="Explica cómo se solucionó" required /></label>
        <ActionMessage state={state} />
        <button className="inventory-small-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <CheckCircle2 />}{pending ? 'Guardando…' : 'Confirmar solución'}</button>
      </form>
    </details>
  );
}

export function TotpSecretForm({
  accountId,
  configured,
}: {
  accountId: number;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(updateTotpSecretAction, initialState);
  return (
    <form className="inventory-totp-form" action={action}>
      <input type="hidden" name="accountId" value={accountId} />
      <div className="inventory-totp-form__heading">
        <span><KeyRound /></span>
        <div>
          <strong>Códigos temporales de acceso</strong>
          <small>{configured ? 'Configurado y cifrado' : 'Todavía no configurado'}</small>
        </div>
        <span className={`status-badge status-badge--${configured ? 'success' : 'warning'}`}>
          {configured ? 'Activo' : 'Pendiente'}
        </span>
      </div>
      <p>Guarda la clave Base32 del autenticador. Nunca se mostrará al cliente; DoraPass generará únicamente el código vigente.</p>
      <div className="inventory-totp-form__controls">
        <label className="form-field">
          <span>{configured ? 'Reemplazar clave TOTP' : 'Clave TOTP Base32'}</span>
          <input name="totpSecret" type="password" autoComplete="off" minLength={16} maxLength={160} placeholder="Pega aquí la clave secreta" required />
        </label>
        <button className="inventory-small-button" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" /> : <Save />}
          {pending ? 'Guardando…' : configured ? 'Reemplazar' : 'Activar'}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function EmailOtpConfigForm({
  accountId,
  configured,
  configuredProvider,
}: {
  accountId: number;
  configured: boolean;
  configuredProvider: string | null;
}) {
  const [state, action, pending] = useActionState(updateEmailOtpAction, initialState);
  const [provider, setProvider] = useState(
    configuredProvider === 'imap' || configuredProvider === 'notletters' ? 'imap' : 'notletters_api',
  );
  return (
    <form className="inventory-totp-form inventory-email-otp-form" action={action}>
      <input type="hidden" name="accountId" value={accountId} />
      <div className="inventory-totp-form__heading">
        <span><Inbox /></span>
        <div>
          <strong>Códigos recibidos por correo</strong>
          <small>{configured ? `Conectado mediante ${configuredProvider === 'notletters_api' ? 'NotLetters API' : 'IMAP'}` : 'Recomendado para Netflix con OTP'}</small>
        </div>
        <span className={`status-badge status-badge--${configured ? 'success' : 'warning'}`}>
          {configured ? 'Activo' : 'Pendiente'}
        </span>
      </div>
      <p>DoraPass comprobará la conexión antes de guardar y solo mostrará al cliente códigos recientes enviados desde dominios oficiales de Netflix.</p>
      <div className="inventory-form-grid">
        <label className="form-field">
          <span>Método de conexión</span>
          <select name="provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="notletters_api">NotLetters API (recomendado)</option>
            <option value="imap">Servidor IMAP</option>
          </select>
        </label>
        <label className="form-field"><span>Correo del buzón</span><input name="inboxEmail" type="email" autoComplete="off" placeholder="correo@proveedor.com" required /></label>
        <label className="form-field"><span>Contraseña del buzón</span><input name="inboxPassword" type="password" autoComplete="new-password" minLength={6} required /></label>
        {provider === 'imap' ? (
          <label className="form-field"><span>Servidor IMAP</span><input name="inboxHost" defaultValue="imap.notletters.com" required /></label>
        ) : (
          <input type="hidden" name="inboxHost" value="" />
        )}
      </div>
      {provider === 'notletters_api' ? <small className="inventory-email-otp-form__hint">El token de la API se configura una sola vez en el servidor y nunca llega al navegador.</small> : null}
      <ActionMessage state={state} />
      <button className="inventory-small-button" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" /> : <Save />}
        {pending ? 'Probando conexión…' : configured ? 'Probar y reemplazar' : 'Probar y activar'}
      </button>
    </form>
  );
}
