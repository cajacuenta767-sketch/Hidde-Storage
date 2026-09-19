'use client';

import {
  BadgeCheck,
  KeyRound,
  MessageCircle,
  QrCode,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';

const steps = [
  {
    icon: ShoppingBag,
    title: '1. Elige tu plan',
    detail:
      'Escoge el servicio, la duración y el país. El precio ya incluye la garantía de todo el plan.',
  },
  {
    icon: Smartphone,
    title: '2. Paga en tu moneda',
    detail:
      'Coordina el pago por WhatsApp con Yape, Plin, QR o transferencia. Sin tarjeta internacional.',
  },
  {
    icon: KeyRound,
    title: '3. Recibe tu acceso',
    detail:
      'Confirmado el pago, te entregamos un token seguro para ver tu acceso en tu cuenta DoraPass.',
  },
];

const faqs = [
  {
    question: '¿Cuánto tarda la entrega?',
    answer:
      'Después de confirmar tu pago, la entrega es en minutos dentro del horario de atención. Recibes un token de un solo uso y con él ves tu acceso directamente en la página de tu pedido.',
  },
  {
    question: '¿Qué pasa si mi acceso falla?',
    answer:
      'Todos los planes tienen garantía durante los días contratados. Si algo falla, escríbenos por WhatsApp o abre un caso en Soporte y lo reponemos o reemplazamos.',
  },
  {
    question: '¿Cómo pago sin tarjeta internacional?',
    answer:
      'Aceptamos Yape, Plin, pago con QR y transferencia bancaria en tu moneda local (soles o bolivianos). Coordinas el pago por WhatsApp al crear tu pedido.',
  },
  {
    question: '¿Puedo renovar mi plan?',
    answer:
      'Sí. Desde tu cuenta puedes pedir la renovación antes del vencimiento y conservas tus días restantes: la nueva fecha se suma a la que ya tenías.',
  },
  {
    question: '¿Comparten mis datos o contraseñas?',
    answer:
      'No. Tus credenciales de acceso se muestran solo a ti, cifradas y bajo token. Nunca publicamos contraseñas ni pedimos códigos por canales no oficiales.',
  },
];

export function TrustSections({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <>
      <section className="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">Cómo funciona DoraPass</h2>
        <div className="how-it-works__grid">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <span className="how-it-works__icon">
                  <Icon />
                </span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            );
          })}
        </div>
        <p className="how-it-works__payments">
          <BadgeCheck /> Pagos aceptados: <strong>Yape</strong> ·{' '}
          <strong>Plin</strong> · <QrCode aria-hidden="true" />{' '}
          <strong>QR</strong> · <strong>Transferencia</strong>
        </p>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <h2 id="faq-title">Preguntas frecuentes</h2>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
        <p className="faq-more">
          ¿Otra duda?{' '}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola DoraPass, tengo una consulta.')}`}
            target="_blank"
            rel="noreferrer"
          >
            Escríbenos por WhatsApp
          </a>
          .
        </p>
      </section>
    </>
  );
}

export function WhatsAppFloatButton({
  whatsappNumber,
}: {
  whatsappNumber: string;
}) {
  if (!whatsappNumber) return null;
  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola DoraPass, quiero información sobre un plan.')}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribir a DoraPass por WhatsApp"
    >
      <MessageCircle />
      <span>WhatsApp</span>
    </a>
  );
}
