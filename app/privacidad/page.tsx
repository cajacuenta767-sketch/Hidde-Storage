import { LegalPage } from '@/components/legal/legal-page';

export default function PrivacyPage() {
  return <LegalPage title="Política de privacidad"><h2>Datos utilizados</h2><p>Durante el registro almacenamos nombre, correo, WhatsApp y país para identificar la cuenta, brindar soporte y vincular suscripciones.</p><h2>Seguridad</h2><p>Las contraseñas se almacenan mediante hash Argon2id. Las sesiones usan tokens aleatorios protegidos y no guardamos contraseñas en el navegador.</p><h2>Conservación</h2><p>Los datos se conservarán mientras la cuenta permanezca activa o mientras sean necesarios para atender compras, garantías y obligaciones aplicables.</p><h2>Contacto</h2><p>El cliente podrá solicitar la revisión de sus datos mediante el canal de soporte disponible en su cuenta.</p></LegalPage>;
}
