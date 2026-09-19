'use client';

import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { TotpCodeCard } from '@/components/account/totp-code-card';
import { EmailOtpCard } from '@/components/account/email-otp-card';

type SecretType = 'provider_email' | 'provider_password' | 'profile_pin';

function AccessSecret({
  subscriptionId,
  secretType,
  label,
  maskedValue,
}: {
  subscriptionId: number;
  secretType: SecretType;
  label: string;
  maskedValue: string;
}) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) return;
    const timeout = window.setTimeout(() => setValue(''), 30_000);
    return () => window.clearTimeout(timeout);
  }, [value]);

  async function reveal() {
    if (value) {
      setValue('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/subscriptions/${subscriptionId}/access`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secretType }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        value?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.value)
        throw new Error(payload?.error ?? 'No se pudo revelar.');
      setValue(payload.value);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'No se pudo revelar.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customer-access-secret">
      <div>
        <span>
          <KeyRound /> {label}
        </span>
        <strong>{value || maskedValue}</strong>
        {value ? (
          <small>
            <ShieldCheck /> Se ocultará en 30 segundos
          </small>
        ) : null}
        {error ? (
          <small className="customer-access-secret__error" role="alert">
            {error}
          </small>
        ) : null}
      </div>
      <button type="button" disabled={loading} onClick={() => void reveal()}>
        {loading ? (
          <LoaderCircle className="spin" />
        ) : value ? (
          <EyeOff />
        ) : (
          <Eye />
        )}
        {loading ? 'Verificando…' : value ? 'Ocultar' : 'Revelar'}
      </button>
    </div>
  );
}

export function CustomerAccessPanel({
  subscriptionId,
  profileName,
  maskedEmail,
  maskedPassword,
  hasPin,
  hasTotp,
  hasEmailOtp,
}: {
  subscriptionId: number;
  profileName: string;
  maskedEmail: string;
  maskedPassword: string;
  hasPin: boolean;
  hasTotp: boolean;
  hasEmailOtp: boolean;
}) {
  return (
    <section className="subscription-detail-section customer-access-panel">
      <div className="account-section-heading">
        <div>
          <h2>Datos de acceso</h2>
          <p>
            Solo tú puedes revelar estas credenciales. Cada consulta queda
            registrada.
          </p>
        </div>
      </div>
      <div className="customer-access-profile">
        <UserRound />
        <span>Perfil asignado</span>
        <strong>{profileName}</strong>
      </div>
      <div className="customer-access-grid">
        <AccessSecret
          subscriptionId={subscriptionId}
          secretType="provider_email"
          label="Correo"
          maskedValue={maskedEmail}
        />
        {!hasEmailOtp ? (
          <AccessSecret
            subscriptionId={subscriptionId}
            secretType="provider_password"
            label="Contraseña"
            maskedValue={maskedPassword}
          />
        ) : null}
        {hasPin ? (
          <AccessSecret
            subscriptionId={subscriptionId}
            secretType="profile_pin"
            label="PIN"
            maskedValue="••••"
          />
        ) : null}
      </div>
      {hasTotp ? <TotpCodeCard subscriptionId={subscriptionId} /> : null}
      {hasEmailOtp ? <EmailOtpCard subscriptionId={subscriptionId} /> : null}
    </section>
  );
}
