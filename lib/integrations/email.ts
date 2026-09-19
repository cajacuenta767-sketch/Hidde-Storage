import 'server-only';

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// Envía por la API HTTP de Resend cuando hay credenciales; en desarrollo,
// sin credenciales, deja el contenido en la consola del servidor.
export async function sendTransactionalEmail(input: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `[DoraPass correo simulado] Para: ${input.to} · Asunto: ${input.subject}\n${input.text}`,
      );
      return true;
    }
    console.error(
      'email_not_configured: define RESEND_API_KEY y EMAIL_FROM para enviar correos.',
    );
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      console.error(
        'email_send_failed',
        payload?.message ?? `HTTP ${response.status}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      'email_send_failed',
      error instanceof Error ? error.message : 'Error desconocido',
    );
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const subject = 'Restablece tu contraseña de DoraPass';
  const text =
    `Recibimos una solicitud para restablecer tu contraseña de DoraPass.\n\n` +
    `Abre este enlace (vence en 30 minutos y funciona una sola vez):\n${resetUrl}\n\n` +
    `Si no fuiste tú, ignora este correo: tu contraseña actual sigue siendo válida.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#101828">
      <h2 style="color:#155eef">DoraPass</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}"
           style="background:#155eef;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#667085;font-size:13px">
        El enlace vence en 30 minutos y funciona una sola vez.
        Si no fuiste tú, ignora este correo: tu contraseña actual sigue siendo válida.
      </p>
    </div>`;
  return sendTransactionalEmail({ to, subject, html, text });
}
