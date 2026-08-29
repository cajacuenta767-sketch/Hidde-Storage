import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luma Pass · Suscripciones a tu ritmo',
  description:
    'Marketplace de suscripciones digitales autorizadas, con entrega inmediata y vendedores verificados.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
