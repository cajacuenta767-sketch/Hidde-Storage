'use client';

import { AlertTriangle, CheckCircle2, Copy, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 5_000;
const LOOKUP_TIMEOUT_MS = 2 * 60_000;

export function EmailOtpCard({ subscriptionId }: { subscriptionId: number }) {
  const [state, setState] = useState<'idle' | 'searching' | 'found' | 'error'>('idle');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => () => { stoppedRef.current = true; }, []);

  async function lookup(startedAt: number) {
    if (stoppedRef.current || Date.now() - startedAt > LOOKUP_TIMEOUT_MS) {
      if (!stoppedRef.current) {
        setState('error');
        setMessage('No llegó un código nuevo en dos minutos. Solicita otro en Netflix y vuelve a intentarlo.');
      }
      return;
    }
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedAt: startedAt }),
      });
      const payload = (await response.json().catch(() => null)) as { status?: string; code?: string; error?: string } | null;
      if (response.status === 202) {
        window.setTimeout(() => void lookup(startedAt), POLL_INTERVAL_MS);
        return;
      }
      if (!response.ok || !payload?.code) throw new Error(payload?.error ?? 'No pudimos consultar el código.');
      setCode(payload.code);
      setState('found');
      setMessage('Código recibido. Usa siempre el más reciente.');
    } catch (caught) {
      setState('error');
      setMessage(caught instanceof Error ? caught.message : 'No pudimos consultar el código.');
    }
  }

  function startLookup() {
    stoppedRef.current = false;
    const startedAt = Date.now() - 15_000;
    setCode('');
    setMessage('Esperando el correo de Netflix… Puede tardar hasta dos minutos.');
    setState('searching');
    void lookup(startedAt);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="email-otp-card" aria-live="polite">
      <header><span><Inbox /></span><div><small>ACCESO NETFLIX</small><h3>Recibe aquí tu código</h3></div></header>
      <ol>
        <li><b>1</b><span>Abre Netflix e ingresa el correo mostrado arriba.</span></li>
        <li><b>2</b><span>Selecciona enviar un código al correo.</span></li>
        <li><b>3</b><span>Regresa y pulsa el botón inferior.</span></li>
      </ol>

      {state === 'found' && code ? (
        <div className="email-otp-card__result">
          <div><small>CÓDIGO MÁS RECIENTE</small><strong>{code}</strong><span>{message}</span></div>
          <button type="button" onClick={() => void copyCode()}>{copied ? <CheckCircle2 /> : <Copy />}{copied ? 'Copiado' : 'Copiar código'}</button>
        </div>
      ) : (
        <button className="email-otp-card__action" type="button" disabled={state === 'searching'} onClick={startLookup}>
          {state === 'searching' ? <LoaderCircle className="spin" /> : <RefreshCw />}
          {state === 'searching' ? 'Buscando código…' : state === 'error' ? 'Buscar nuevamente' : 'Ya solicité mi código'}
        </button>
      )}
      {message && state !== 'found' ? <p className={state === 'error' ? 'is-error' : ''}>{state === 'error' ? <AlertTriangle /> : <LoaderCircle className="spin" />}{message}</p> : null}
      <small className="email-otp-card__notice"><AlertTriangle /> No cierres esta página y no solicites varios códigos seguidos.</small>
    </section>
  );
}
