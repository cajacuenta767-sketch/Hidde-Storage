import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const action = process.argv[2] ?? 'status';
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

if (!token) {
  console.error('Falta TELEGRAM_BOT_TOKEN en .env.local.');
  process.exit(1);
}

const apiBase = `https://api.telegram.org/bot${token}`;

async function telegram(method, body) {
  const response = await fetch(`${apiBase}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description ?? `Telegram respondió HTTP ${response.status}.`);
  }
  return payload.result;
}

function publicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '');
}

async function verifyBot() {
  const bot = await telegram('getMe');
  console.log(`Bot verificado: @${bot.username} (${bot.first_name})`);
  return bot;
}

async function showStatus() {
  await verifyBot();
  const info = await telegram('getWebhookInfo');
  console.log(`Webhook: ${info.url || 'no registrado'}`);
  console.log(`Actualizaciones pendientes: ${info.pending_update_count ?? 0}`);
  if (info.last_error_message) {
    console.log(`Último error: ${info.last_error_message}`);
  }
}

async function findChatIds() {
  await verifyBot();
  const webhook = await telegram('getWebhookInfo');
  if (webhook.url) {
    throw new Error(
      'Telegram no permite getUpdates mientras existe un webhook. Ejecuta primero: npm run telegram:remove',
    );
  }
  const updates = await telegram('getUpdates', {
    timeout: 0,
    allowed_updates: ['message', 'callback_query'],
  });
  const chats = new Map();
  for (const update of updates) {
    const chat = update.message?.chat;
    if (chat) chats.set(chat.id, chat);
  }
  if (!chats.size) {
    console.log('No encontré mensajes. Abre el bot en Telegram, pulsa Iniciar, envía /start y vuelve a ejecutar este comando.');
    return;
  }
  console.log('Chats encontrados:');
  for (const chat of chats.values()) {
    const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || 'Sin nombre';
    console.log(`- ${name}: ${chat.id}`);
  }
}

async function registerWebhook() {
  await verifyBot();
  const appUrl = publicAppUrl();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const chatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS?.trim();
  const adminEmail = process.env.TELEGRAM_ADMIN_EMAIL?.trim();

  if (!/^https:\/\//i.test(appUrl)) {
    throw new Error('NEXT_PUBLIC_APP_URL debe ser una dirección pública HTTPS. 127.0.0.1 no funciona como webhook.');
  }
  if (!secret || !/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET debe tener entre 16 y 256 caracteres: letras, números, guion o guion bajo.');
  }
  if (!chatIds || !chatIds.split(',').every((value) => /^-?\d+$/.test(value.trim()))) {
    throw new Error('Configura TELEGRAM_ADMIN_CHAT_IDS con uno o más identificadores numéricos.');
  }
  if (!adminEmail || !adminEmail.includes('@')) {
    throw new Error('Configura TELEGRAM_ADMIN_EMAIL con el correo de un administrador de DoraPass.');
  }

  await telegram('setMyCommands', {
    commands: [
      { command: 'pedido', description: 'Consultar estado: /pedido DP-...' },
      { command: 'token', description: 'Generar token: /token DP-...' },
    ],
  });
  const webhookUrl = `${appUrl}/api/integrations/telegram/webhook`;
  await telegram('setWebhook', {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  console.log(`Webhook registrado correctamente: ${webhookUrl}`);
  await showStatus();
}

async function removeWebhook() {
  await verifyBot();
  await telegram('deleteWebhook', { drop_pending_updates: false });
  console.log('Webhook retirado. El bot y sus datos no fueron eliminados.');
}

async function sendTestMessage() {
  await verifyBot();
  const chatId = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((value) => Number(value.trim()))
    .find(Number.isSafeInteger);
  if (!chatId) throw new Error('Falta TELEGRAM_ADMIN_CHAT_IDS.');
  await telegram('sendMessage', {
    chat_id: chatId,
    text:
      '✅ DoraPass quedó conectado correctamente.\n\nComandos:\n/pedido DP-AAAAMMDD-XXXXXXXX\n/token DP-AAAAMMDD-XXXXXXXX',
  });
  console.log('Mensaje de prueba enviado al administrador autorizado.');
}

try {
  if (action === 'status') await showStatus();
  else if (action === 'chat-id') await findChatIds();
  else if (action === 'register') await registerWebhook();
  else if (action === 'remove') await removeWebhook();
  else if (action === 'test') await sendTestMessage();
  else throw new Error(`Acción desconocida: ${action}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Error configurando Telegram.');
  process.exit(1);
}
