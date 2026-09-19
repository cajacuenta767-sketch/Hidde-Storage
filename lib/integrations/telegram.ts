import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  customers,
  purchaseOrderItems,
  purchaseOrders,
} from '@/db/schema';

type TelegramButton = {
  text: string;
  callback_data?: string;
  copy_text?: { text: string };
  url?: string;
};

function configuredChatIds() {
  return (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter(Number.isSafeInteger);
}

async function sendToTelegramAdmins(input: {
  text: string;
  buttons?: TelegramButton[][];
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIds = configuredChatIds();
  if (!botToken || chatIds.length === 0) return false;

  const results = await Promise.allSettled(
    chatIds.map(async (chatId) => {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: input.text,
            disable_web_page_preview: true,
            ...(input.buttons
              ? { reply_markup: { inline_keyboard: input.buttons } }
              : {}),
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { description?: string }
          | null;
        throw new Error(payload?.description ?? `Telegram HTTP ${response.status}`);
      }
    }),
  );
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length) {
    console.error(
      'telegram_admin_notification_failed',
      failed.map((result) =>
        result.status === 'rejected' && result.reason instanceof Error
          ? result.reason.message
          : 'Error desconocido',
      ),
    );
  }
  return failed.length < results.length;
}

async function getOrderSummary(publicId: string) {
  const [order] = await db
    .select({
      id: purchaseOrders.id,
      publicId: purchaseOrders.publicId,
      status: purchaseOrders.status,
      marketCode: purchaseOrders.marketCode,
      currency: purchaseOrders.currency,
      totalAmountMinor: purchaseOrders.totalAmountMinor,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phoneE164,
    })
    .from(purchaseOrders)
    .innerJoin(customers, eq(customers.id, purchaseOrders.customerId))
    .where(eq(purchaseOrders.publicId, publicId))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      serviceName: purchaseOrderItems.serviceName,
      planName: purchaseOrderItems.planName,
      accessTypeCode: purchaseOrderItems.accessTypeCode,
      durationMonths: purchaseOrderItems.durationMonths,
      amountMinor: purchaseOrderItems.amountMinor,
    })
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.orderId, order.id))
    .orderBy(asc(purchaseOrderItems.id));

  const money = new Intl.NumberFormat(
    order.marketCode === 'PE' ? 'es-PE' : 'es-BO',
    {
      style: 'currency',
      currency: order.currency,
      maximumFractionDigits: 0,
    },
  );
  const productLines = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.serviceName} — ${item.planName}\n` +
        `   ${item.accessTypeCode === 'PROFILE' ? 'Perfil' : 'Cuenta completa'} · ${item.durationMonths} mes(es) · ${money.format(item.amountMinor / 100)}`,
    )
    .join('\n');
  return {
    ...order,
    total: money.format(order.totalAmountMinor / 100),
    productLines,
  };
}

function adminOrderUrl(publicId: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return appUrl ? `${appUrl}/admin/pedidos/compra/${publicId}` : null;
}

export async function notifyTelegramOrderCreated(publicId: string) {
  const order = await getOrderSummary(publicId);
  if (!order) return false;
  const url = adminOrderUrl(publicId);
  return sendToTelegramAdmins({
    text:
      `🛒 NUEVO PEDIDO DORAPASS\n\n` +
      `Pedido: ${order.publicId}\n` +
      `Cliente: ${order.customerName}\n` +
      `WhatsApp: ${order.customerPhone}\n` +
      `Correo: ${order.customerEmail}\n` +
      `País: ${order.marketCode === 'PE' ? 'Perú' : 'Bolivia'}\n\n` +
      `${order.productLines}\n\n` +
      `Total: ${order.total}\n` +
      `Estado: esperando confirmación del pago.`,
    buttons: [
      [
        {
          text: '✅ Confirmar pago recibido',
          callback_data: `confirm_payment:${order.publicId}`,
        },
      ],
      [{ text: 'Copiar pedido', copy_text: { text: order.publicId } }],
      ...(url ? [[{ text: 'Abrir pedido', url }]] : []),
    ],
  });
}

export async function notifyTelegramTokenIssued(input: {
  publicId: string;
  token: string;
  expiresAt: Date;
}) {
  const order = await getOrderSummary(input.publicId);
  if (!order) return false;
  const customerMessage =
    `Hola ${order.customerName.split(/\s+/)[0]}, tu pago del pedido ${order.publicId} fue confirmado. ` +
    `Tu token DoraPass es ${input.token}. Ingrésalo en la página de tu pedido. ` +
    `Vence en 30 minutos y funciona una sola vez.`;
  const url = adminOrderUrl(input.publicId);
  return sendToTelegramAdmins({
    text:
      `✅ PAGO CONFIRMADO · TOKEN LISTO\n\n` +
      `Pedido: ${order.publicId}\n` +
      `Cliente: ${order.customerName}\n` +
      `WhatsApp: ${order.customerPhone}\n\n` +
      `${order.productLines}\n\n` +
      `Total: ${order.total}\n\n` +
      `🔑 TOKEN: ${input.token}\n` +
      `Vence: ${new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' }).format(input.expiresAt)}\n\n` +
      `Mensaje listo para el cliente:\n${customerMessage}`,
    buttons: [
      [{ text: 'Copiar token', copy_text: { text: input.token } }],
      [{ text: 'Copiar mensaje para el cliente', copy_text: { text: customerMessage } }],
      ...(url ? [[{ text: 'Abrir pedido', url }]] : []),
    ],
  });
}

export async function notifyTelegramPaymentNeedsInventory(publicId: string) {
  const order = await getOrderSummary(publicId);
  if (!order) return false;
  const url = adminOrderUrl(publicId);
  return sendToTelegramAdmins({
    text:
      `⚠️ PAGO CONFIRMADO · FALTA INVENTARIO\n\n` +
      `Pedido: ${order.publicId}\nCliente: ${order.customerName}\n\n` +
      `${order.productLines}\n\nNo se generó token porque falta asignar una cuenta o perfil.`,
    buttons: [
      [
        {
          text: '🔄 Reintentar asignación',
          callback_data: `retry_inventory:${order.publicId}`,
        },
      ],
      ...(url ? [[{ text: 'Resolver pedido', url }]] : []),
    ],
  });
}
