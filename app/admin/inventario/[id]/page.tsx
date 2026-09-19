import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Globe2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import {
  AssignProfileForm,
  OpenIncidentForm,
  ReleaseProfileForm,
  ResolveIncidentForm,
  TotpSecretForm,
  EmailOtpConfigForm,
} from '@/components/admin/inventory-forms';
import { RevealSecret } from '@/components/admin/reveal-secret';
import { getServiceAccountDetail } from '@/lib/admin/inventory-data';
import {
  incidentPriorityMeta,
  incidentStatusMeta,
  profileStatusMeta,
  renewalLabel,
  serviceAccountStatusMeta,
} from '@/lib/admin/inventory-presentation';
import { formatAdminDate, formatAdminMoney } from '@/lib/admin/presentation';

const secretLabels: Record<string, string> = {
  provider_email: 'Correo del proveedor',
  provider_password: 'Contraseña del proveedor',
  profile_pin: 'PIN de perfil',
};

export default async function InventoryAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const accountId = Number((await params).id);
  if (!Number.isSafeInteger(accountId) || accountId < 1) notFound();
  const account = await getServiceAccountDetail(accountId);
  if (!account) notFound();

  const accountStatus = serviceAccountStatusMeta[account.status];
  const occupied = account.profiles.filter((profile) => profile.status === 'assigned').length;
  const occupancy = account.profiles.length > 0 ? Math.round((occupied / account.profiles.length) * 100) : 0;
  const openIncidents = account.incidents.filter((incident) => ['open', 'in_review'].includes(incident.status));

  return (
    <div className="account-page admin-page inventory-page">
      <Link className="admin-back-link" href="/admin/inventario"><ArrowLeft /> Volver al inventario</Link>
      <header className="inventory-detail-hero">
        <div className="inventory-detail-identity">
          <span className="inventory-detail-logo"><Image src={account.imagePath} alt={account.imageAlt} fill sizes="86px" loading="eager" /></span>
          <div><small>{account.internalCode}</small><h1>{account.serviceName}</h1><p>{account.planLabel}</p></div>
        </div>
        <span className={`status-badge status-badge--${accountStatus.tone}`}>{accountStatus.label}</span>
      </header>

      <section className="inventory-detail-summary" aria-label="Resumen de la cuenta">
        <article><UsersRound /><div><span>Ocupación</span><strong>{occupied} de {account.profiles.length} perfiles</strong><small>{occupancy}% utilizado</small></div></article>
        <article><CalendarDays /><div><span>Próxima renovación</span><strong>{formatAdminDate(account.renewalDate)}</strong><small className={account.daysToRenewal !== null && account.daysToRenewal <= 7 ? 'inventory-text-alert' : ''}>{renewalLabel(account.daysToRenewal)}</small></div></article>
        <article><Globe2 /><div><span>Región</span><strong>{account.regionLabel}</strong><small>{account.providerLabel}</small></div></article>
        <article><AlertTriangle /><div><span>Incidencias</span><strong>{openIncidents.length} abiertas</strong><small>{account.incidents.length} registradas</small></div></article>
        <article><ShieldCheck /><div><span>Costo</span><strong>{account.costMinor !== null && account.costCurrency ? formatAdminMoney(account.costMinor, account.costCurrency) : 'Sin registro'}</strong><small>Dato interno</small></div></article>
      </section>

      <section className="account-section admin-section inventory-credentials-section">
        <div className="account-section-heading"><div><h2>Credenciales de la cuenta</h2><p>Los datos sensibles están cifrados y cada consulta queda registrada.</p></div><span className="inventory-protected-label"><ShieldCheck /> Acceso protegido</span></div>
        <div className="protected-secrets-grid">
          <RevealSecret accountId={account.id} secretType="provider_email" label="Correo" maskedValue={account.maskedEmail} />
          <RevealSecret accountId={account.id} secretType="provider_password" label="Contraseña" maskedValue={account.maskedPassword} />
        </div>
        <TotpSecretForm accountId={account.id} configured={account.hasTotpSecret} />
        <EmailOtpConfigForm accountId={account.id} configured={account.hasEmailOtp} configuredProvider={account.emailOtpProvider} />
        {account.notes ? <div className="inventory-account-notes"><strong>Notas internas</strong><p>{account.notes}</p></div> : null}
      </section>

      <section className="account-section admin-section">
        <div className="account-section-heading"><div><h2>Perfiles y clientes</h2><p>Un perfil solo puede tener una asignación activa.</p></div><span className="inventory-section-count">{occupied}/{account.profiles.length} ocupados</span></div>
        <div className="inventory-profile-list">
          {account.profiles.map((profile) => {
            const profileMeta = profileStatusMeta[profile.status] ?? profileStatusMeta.available;
            return (
              <article className={`inventory-profile-card inventory-profile-card--${profile.status}`} key={profile.id}>
                <div className="inventory-profile-number"><span>{profile.position}</span></div>
                <div className="inventory-profile-main">
                  <div className="inventory-profile-heading"><div><h3>{profile.displayName}</h3><small>Perfil #{profile.position} · ID {profile.id}</small></div><span className={`status-badge status-badge--${profileMeta.tone}`}>{profileMeta.label}</span></div>
                  {profile.assignmentId && profile.customerName ? (
                    <div className="inventory-profile-customer">
                      <span><UserRound /></span>
                      <div><strong>{profile.customerName}</strong><small>{profile.customerEmail} · {profile.marketCode === 'PE' ? 'Perú' : 'Bolivia'}</small></div>
                      <div><span>Suscripción #{profile.subscriptionId}</span><strong>Vence {formatAdminDate(profile.expiresAt)}</strong></div>
                    </div>
                  ) : (
                    <div className="inventory-profile-available"><UsersRound /><span>Perfil disponible para una suscripción activa de {account.serviceName}.</span></div>
                  )}
                  <div className="inventory-profile-actions">
                    {profile.hasPin ? <RevealSecret accountId={account.id} profileId={profile.id} secretType="profile_pin" label="PIN" maskedValue="••••" /> : <div className="inventory-no-pin"><KeyRound /> Sin PIN registrado</div>}
                    {profile.assignmentId ? <ReleaseProfileForm assignmentId={profile.assignmentId} /> : profile.status === 'available' ? <AssignProfileForm profileId={profile.id} candidates={account.candidates} /> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="account-section admin-section inventory-incidents-section">
        <div className="account-section-heading"><div><h2>Incidencias de la cuenta</h2><p>Registra problemas y documenta su solución.</p></div></div>
        <OpenIncidentForm accountId={account.id} profiles={account.profiles.map(({ id, displayName }) => ({ id, displayName }))} />
        <div className="inventory-incident-list">
          {account.incidents.length > 0 ? account.incidents.map((incident) => {
            const status = incidentStatusMeta[incident.status];
            const priority = incidentPriorityMeta[incident.priority] ?? incidentPriorityMeta.medium;
            return <article key={incident.id}>
              <span className={`inventory-incident-icon inventory-incident-icon--${priority.tone}`}><AlertTriangle /></span>
              <div><div className="inventory-incident-heading"><strong>{incident.title}</strong><span className={`status-badge status-badge--${priority.tone}`}>{priority.label}</span><span className={`status-badge status-badge--${status.tone}`}>{status.label}</span></div><p>{incident.description}</p><small>Creada {formatAdminDate(incident.createdAt, true)}{incident.resolutionNote ? ` · Solución: ${incident.resolutionNote}` : ''}</small></div>
              {['open', 'in_review'].includes(incident.status) ? <ResolveIncidentForm incidentId={incident.id} /> : <CheckCircle2Icon />}
            </article>;
          }) : <div className="admin-activity-empty"><ShieldCheck /><span>Esta cuenta no tiene incidencias registradas.</span></div>}
        </div>
      </section>

      <section className="account-section admin-section">
        <div className="account-section-heading"><div><h2>Historial de acceso</h2><p>Auditoría de consultas de credenciales protegidas.</p></div></div>
        {account.accessHistory.length > 0 ? <div className="inventory-access-history">{account.accessHistory.map((event) => <article key={event.id}><span><Clock3 /></span><div><strong>{secretLabels[event.secretType] ?? event.secretType} consultado</strong><small>{event.reason} · {event.adminName}</small></div><time>{formatAdminDate(event.createdAt, true)}</time></article>)}</div> : <div className="admin-activity-empty"><Mail /><span>Todavía no se consultaron credenciales de esta cuenta.</span></div>}
      </section>
    </div>
  );
}

function CheckCircle2Icon() {
  return <span className="inventory-resolved-icon"><ShieldCheck /></span>;
}
