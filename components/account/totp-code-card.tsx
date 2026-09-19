'use client';

import { AlertTriangle, CheckCircle2, Copy, KeyRound, LoaderCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function TotpCodeCard({ subscriptionId }: { subscriptionId: number }) {
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadCode = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/totp`, { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { code?: string; expiresAt?: number; error?: string } | null;
      if (!response.ok || !payload?.code || !payload.expiresAt) {
        throw new Error(payload?.error ?? 'No se pudo generar el código temporal.');
      }
      setCode(payload.code);
      setExpiresAt(payload.expiresAt);
      setRemaining(Math.max(0, Math.ceil((payload.expiresAt - Date.now()) / 1000)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo generar el código temporal.');
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadCode(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadCode]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) void loadCode();
    }, 500);
    return () => window.clearInterval(timer);
  }, [expiresAt, loadCode]);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="totp-code-card" aria-live="polite">
      <header>
        <span><KeyRound /></span>
        <div><small>PASO 3</small><h3>Código temporal de acceso</h3></div>
      </header>
      <ol>
        <li><b>1</b><span>Ingresa el correo de la cuenta.</span></li>
        <li><b>2</b><span>Escribe la contraseña.</span></li>
        <li className="is-current"><b>3</b><span>Copia el código que aparece aquí.</span></li>
      </ol>
      {loading && !code ? <div className="totp-code-card__loading"><LoaderCircle className="spin" /> Generando código seguro…</div> : null}
      {code ? (
        <div className="totp-code-card__code">
          <div><small>CÓDIGO VIGENTE</small><strong>{code.slice(0, 3)} {code.slice(3)}</strong></div>
          <button type="button" onClick={() => void copyCode()}>{copied ? <CheckCircle2 /> : <Copy />}{copied ? 'Copiado' : 'Copiar'}</button>
          <span><i style={{ width: `${Math.min(100, (remaining / 30) * 100)}%` }} /></span>
          <small>Cambia en {remaining} segundos</small>
        </div>
      ) : null}
      {error ? <div className="totp-code-card__error"><AlertTriangle /> {error}<button type="button" onClick={() => void loadCode()}><RefreshCw /> Reintentar</button></div> : null}
      <p><AlertTriangle /> Mantén DoraPass abierto mientras inicias sesión. No compartas este código con otras personas.</p>
    </section>
  );
}
