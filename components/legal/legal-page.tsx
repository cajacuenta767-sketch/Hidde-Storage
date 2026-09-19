import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <div className="legal-page__header"><Link className="account-brand" href="/"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>DoraPass</span></Link></div>
      <article><Link className="account-back-link" href="/registro"><ArrowLeft /> Volver al registro</Link><h1>{title}</h1><p className="legal-draft">Borrador operativo para la etapa de desarrollo. Debe revisarse legalmente antes del lanzamiento comercial.</p>{children}</article>
    </main>
  );
}
