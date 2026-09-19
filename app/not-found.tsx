import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <Link className="auth-brand" href="/"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>DoraPass</span></Link>
      <div><SearchX /><span>404</span><h1>No encontramos esta página</h1><p>El enlace puede haber vencido o el contenido no está disponible para tu cuenta.</p><Link className="account-button" href="/"><ArrowLeft /> Volver al catálogo</Link></div>
    </main>
  );
}
