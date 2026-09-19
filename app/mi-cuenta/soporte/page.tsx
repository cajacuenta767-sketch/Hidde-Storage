import { CircleHelp, MessageCircle, ShieldCheck } from 'lucide-react';

import { requireCustomer } from '@/lib/auth/session';

export default async function SupportPage() {
  const customer = await requireCustomer();
  const whatsapp = (process.env.DORAPASS_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
  const message = encodeURIComponent(`Hola, soy ${customer.fullName}. Necesito ayuda con mi cuenta DoraPass.`);
  return (
    <div className="account-page">
      <header className="account-page-header"><div><h1>Soporte y garantía</h1><p>Cuéntanos qué sucede y revisaremos tu caso.</p></div></header>
      <section className="support-grid">
        <article><span><MessageCircle /></span><h2>Hablar con soporte</h2><p>Escríbenos por WhatsApp indicando la plataforma y tu número de suscripción.</p><a className="account-button" href={`${whatsapp ? `https://wa.me/${whatsapp}` : 'https://wa.me/'}?text=${message}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a></article>
        <article><span><ShieldCheck /></span><h2>Solicitar garantía</h2><p>La cobertura se mantiene durante los días indicados en cada suscripción activa.</p><a className="account-button account-button--secondary" href={`${whatsapp ? `https://wa.me/${whatsapp}` : 'https://wa.me/'}?text=${encodeURIComponent(`Hola, soy ${customer.fullName}. Quiero solicitar una revisión de garantía en DoraPass.`)}`} target="_blank" rel="noreferrer">Solicitar revisión</a></article>
        <article><span><CircleHelp /></span><h2>Antes de escribir</h2><p>Nunca envíes tu contraseña personal. Comparte solamente el código de suscripción que aparece en tu panel.</p></article>
      </section>
    </div>
  );
}
