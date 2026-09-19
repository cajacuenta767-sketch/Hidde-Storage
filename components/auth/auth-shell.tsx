import Link from 'next/link';

import { ArrowLeft, CalendarCheck2, ShieldCheck } from 'lucide-react';

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="DoraPass">
        <Link className="auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>DoraPass</span>
        </Link>
        <div className="auth-brand-copy">
          <h2>Tus suscripciones, siempre bajo control.</h2>
          <p>Consulta vencimientos, renueva a tiempo y recibe soporte desde un solo lugar.</p>
          <div className="auth-benefit"><CalendarCheck2 /><span>Alertas antes de cada vencimiento</span></div>
          <div className="auth-benefit"><ShieldCheck /><span>Sesión y datos protegidos</span></div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <Link className="auth-back" href="/"><ArrowLeft /> Volver al catálogo</Link>
          <div className="auth-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
