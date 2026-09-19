'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Headphones,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  PartyPopper,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TotpCodeCard } from '@/components/account/totp-code-card';
import { EmailOtpCard } from '@/components/account/email-otp-card';

type RevealedAccess = {
  subscriptionId: number;
  serviceName: string;
  planName: string;
  email: string;
  password: string | null;
  pin: string | null;
  hasTotp: boolean;
  hasEmailOtp: boolean;
};

async function loadSecret(subscriptionId: number, secretType: string) {
  const response = await fetch(`/api/subscriptions/${subscriptionId}/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secretType }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { value?: string }
    | null;
  return response.ok ? (payload?.value ?? null) : null;
}

export function OrderDelivery({
  publicId,
  status,
  whatsappUrl,
  supportUrl,
}: {
  publicId: string;
  status: string;
  whatsappUrl: string;
  supportUrl: string;
}) {
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [accesses, setAccesses] = useState<RevealedAccess[]>([]);
  const [copied, setCopied] = useState('');
  const [secretsVisible, setSecretsVisible] = useState(false);
  const [step, setStep] = useState(status === 'token_issued' ? 3 : 1);

  useEffect(() => {
    if (!secretsVisible) return;
    const timeout = window.setTimeout(() => setSecretsVisible(false), 30_000);
    return () => window.clearTimeout(timeout);
  }, [secretsVisible]);

  async function redeem() {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${publicId}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; items?: Array<{ subscriptionId: number; serviceName: string; planName: string; hasTotp: boolean; hasEmailOtp: boolean }> }
        | null;
      if (!response.ok || !payload?.items) {
        throw new Error(payload?.error ?? 'No pudimos validar el token.');
      }
      const revealed = await Promise.all(
        payload.items.map(async (item) => {
          const [email, password, pin] = await Promise.all([
            loadSecret(item.subscriptionId, 'provider_email'),
            item.hasEmailOtp ? Promise.resolve(null) : loadSecret(item.subscriptionId, 'provider_password'),
            loadSecret(item.subscriptionId, 'profile_pin'),
          ]);
          return {
            ...item,
            email: email ?? 'Consulta con soporte',
            password: item.hasEmailOtp ? null : (password ?? 'Consulta con soporte'),
            pin,
          };
        }),
      );
      setAccesses(revealed);
      setToken('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos validar el token.');
    } finally {
      setPending(false);
    }
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1500);
  }

  async function copyAll(access: RevealedAccess) {
    const credentials = [
      `${access.serviceName} — ${access.planName}`,
      `Correo: ${access.email}`,
      ...(access.password ? [`Contraseña: ${access.password}`] : []),
      ...(access.pin ? [`PIN: ${access.pin}`] : []),
    ].join('\n');
    await copy(`all-${access.subscriptionId}`, credentials);
  }

  return (
    <div className="order-delivery-page">
      {accesses.length ? (
        <section className="delivery-access-panel">
          <header className="delivery-success-title">
            <span className="delivery-success-title__icon"><PartyPopper /></span>
            <div>
              <small>COMPRA COMPLETADA · {publicId}</small>
              <h1>¡Gracias por tu compra!</h1>
              <p>Tu acceso ya está listo. También podrás consultarlo desde Mis suscripciones.</p>
            </div>
            <span className="delivery-success-badge"><CheckCircle2 /> Entregado</span>
          </header>

          <div className="delivery-security-bar">
            <span><ShieldCheck /> Tus datos están protegidos</span>
            <button type="button" onClick={() => setSecretsVisible((visible) => !visible)}>
              {secretsVisible ? <EyeOff /> : <Eye />}
              {secretsVisible ? 'Ocultar datos' : 'Mostrar datos'}
            </button>
          </div>

          <div className="delivery-access-grid">
            {accesses.map((access) => (
              <article key={access.subscriptionId}>
                <div className="delivery-product-heading">
                  <span aria-hidden>{access.serviceName.slice(0, 1).toUpperCase()}</span>
                  <div><h2>{access.serviceName}</h2><small>{access.planName}</small></div>
                  <button type="button" onClick={() => copyAll(access)}>
                    {copied === `all-${access.subscriptionId}` ? <CheckCircle2 /> : <Copy />}
                    {copied === `all-${access.subscriptionId}` ? 'Copiado' : 'Copiar todo'}
                  </button>
                </div>
                {[
                  { label: 'Correo', value: access.email, secret: false },
                  ...(access.password ? [{ label: 'Contraseña', value: access.password, secret: true }] : []),
                  ...(access.pin ? [{ label: 'PIN', value: access.pin, secret: true }] : []),
                ].map(({ label, value, secret }) => {
                  const copyKey = `${access.subscriptionId}-${label}`;
                  return (
                  <div className="delivery-secret-row" key={label}>
                    <span>
                      <small>{label}</small>
                      <strong className={secret && !secretsVisible ? 'is-masked' : undefined}>
                        {secret && !secretsVisible ? '••••••••' : value}
                      </strong>
                    </span>
                    <button type="button" onClick={() => copy(copyKey, value)} aria-label={`Copiar ${label}`}>
                      {copied === copyKey ? <CheckCircle2 /> : <Copy />}
                    </button>
                  </div>
                  );
                })}
                {access.hasTotp ? <TotpCodeCard subscriptionId={access.subscriptionId} /> : null}
                {access.hasEmailOtp ? <EmailOtpCard subscriptionId={access.subscriptionId} /> : null}
              </article>
            ))}
          </div>

          <p className="delivery-access-note">
            <LockKeyhole /> Por seguridad, la contraseña y el PIN se ocultan automáticamente después de 30 segundos.
          </p>

          <div className="delivery-success-actions">
            <Link className="account-button" href="/mi-cuenta/suscripciones">
              <ShoppingBag /> Mis suscripciones
            </Link>
            <Link className="account-button account-button--secondary" href="/">
              Seguir comprando <ArrowRight />
            </Link>
            <a className="delivery-help-link" href={supportUrl} target="_blank" rel="noreferrer">
              <Headphones /> ¿Necesitas ayuda?
            </a>
          </div>
        </section>
      ) : (
        <section className="delivery-assistant">
          <header className="delivery-assistant__header">
            <div>
              <small>COMPRA SEGURA · PEDIDO {publicId}</small>
              <h1>Recibe tu compra en 3 pasos</h1>
              <p>Sigue el paso marcado. Te tomará solo unos minutos.</p>
            </div>
            {status !== 'delivered' ? (
              <button className="delivery-token-shortcut" type="button" onClick={() => setStep(3)}>
                <KeyRound /> Ya tengo mi token
              </button>
            ) : null}
          </header>

          <nav className="delivery-progress" aria-label="Pasos para recibir la compra">
            {[
              { number: 1, title: 'Escribe por WhatsApp', detail: 'Enviamos el resumen', icon: MessageCircle },
              { number: 2, title: 'Realiza el pago', detail: 'Verificamos el abono', icon: ShieldCheck },
              { number: 3, title: 'Ingresa tu token', detail: 'Recibe tus datos', icon: KeyRound },
            ].map((item) => {
              const Icon = item.icon;
              const active = step === item.number;
              const completed = step > item.number;
              return (
                <button
                  className={`delivery-progress__step${active ? ' is-active' : ''}${completed ? ' is-complete' : ''}`}
                  type="button"
                  key={item.number}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => setStep(item.number)}
                >
                  <span>{completed ? <CheckCircle2 /> : <Icon />}</span>
                  <b>Paso {item.number}</b>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </button>
              );
            })}
          </nav>

          <div className="delivery-action-panel" aria-live="polite">
            {step === 1 ? (
              <>
                <span className="delivery-action-panel__icon"><MessageCircle /></span>
                <div className="delivery-action-panel__copy">
                  <small>PASO 1 DE 3</small>
                  <h2>Envíanos tu pedido por WhatsApp</h2>
                  <p>El mensaje ya incluye tus productos, duración, país y total. Solo tienes que enviarlo.</p>
                </div>
                <a
                  className="account-button delivery-primary-action"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setStep(2)}
                >
                  <MessageCircle /> Abrir WhatsApp <ArrowRight />
                </a>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <span className="delivery-action-panel__icon"><ShieldCheck /></span>
                <div className="delivery-action-panel__copy">
                  <small>PASO 2 DE 3</small>
                  <h2>Paga con el QR que te enviaremos</h2>
                  <p>Después de pagar, verificaremos el abono y te mandaremos el token por WhatsApp.</p>
                  <span className="delivery-waiting"><Clock3 /> La confirmación es manual y segura</span>
                </div>
                <div className="delivery-action-panel__buttons">
                  <a className="account-button account-button--secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
                    Volver a WhatsApp
                  </a>
                  <button className="account-button" type="button" onClick={() => setStep(3)}>
                    Ya recibí mi token <ArrowRight />
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <span className="delivery-action-panel__icon"><KeyRound /></span>
                <div className="delivery-action-panel__copy">
                  <small>PASO 3 DE 3</small>
                  <h2>Ingresa tu token de entrega</h2>
                  <p>Escribe el código que recibiste por WhatsApp para mostrar tus credenciales.</p>
                </div>
                {status !== 'delivered' ? (
                  <div className="delivery-token-entry">
                    <input
                      aria-label="Token de entrega"
                      autoComplete="one-time-code"
                      inputMode="text"
                      maxLength={12}
                      placeholder="DP-XXXX-XXXX"
                      value={token}
                      onChange={(event) => setToken(event.target.value.toUpperCase())}
                    />
                    <button
                      className="account-button"
                      type="button"
                      disabled={pending || token.length < 10}
                      onClick={redeem}
                    >
                      {pending ? <LoaderCircle className="spin" /> : <LockKeyhole />}
                      {pending ? 'Validando…' : 'Ver mis datos'}
                    </button>
                  </div>
                ) : (
                  <p className="delivery-info-note">
                    Este pedido ya fue entregado. Consulta el acceso desde Mis suscripciones.
                  </p>
                )}
              </>
            ) : null}
          </div>
          {error ? <p className="form-message form-message--error delivery-assistant__error">{error}</p> : null}
          <footer className="delivery-assistant__footer">
            <ShieldCheck /> Sin pasarelas externas
            <span>·</span>
            <KeyRound /> Token privado de un solo uso
          </footer>
        </section>
      )}
    </div>
  );
}
