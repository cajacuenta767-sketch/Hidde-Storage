import { timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db/client';
import { customers, purchaseOrders } from '@/db/schema';
import {
  confirmPaymentAndDeliver,
  retryFulfillingOrderDelivery,
} from '@/lib/orders/confirmation';
import { issueDeliveryToken } from '@/lib/orders/delivery';

const updateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      text: z.string().optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      from: z.object({ id: z.number() }),
      data: z.string().optional(),
      message: z
        .object({ chat: z.object({ id: z.number() }) })
        .optional(),
    })
    .optional(),
});

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  buttons?: Array<Array<{ text: string; callback_data: string }>>,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  });
}

async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
  showAlert = false,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  });
}

async function getTelegramAdmin() {
  const adminEmail = process.env.TELEGRAM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return null;
  const [admin] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.email, adminEmail),
        eq(customers.role, 'admin'),
        eq(customers.status, 'active'),
      ),
    )
    .limit(1);
  return admin ?? null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!webhookSecret || !safeEquals(receivedSecret, webhookSecret)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const allowedChats = new Set(
    (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter(Number.isSafeInteger),
  );

  const callback = parsed.data.callback_query;
  if (callback?.data) {
    const chatId = callback.message?.chat.id ?? callback.from.id;
    if (!allowedChats.has(chatId) || !allowedChats.has(callback.from.id)) {
      await answerCallbackQuery(callback.id, 'No autorizado.', true);
      return NextResponse.json({ ok: true });
    }
    const match = callback.data.match(
      /^(confirm_payment|retry_inventory):(DP-\d{8}-[A-F0-9]{8})$/,
    );
    if (!match) {
      await answerCallbackQuery(callback.id, 'Acción no válida.', true);
      return NextResponse.json({ ok: true });
    }
    const admin = await getTelegramAdmin();
    if (!admin) {
      await answerCallbackQuery(
        callback.id,
        'Administrador no configurado.',
        true,
      );
      return NextResponse.json({ ok: true });
    }

    // Telegram keeps the button spinner active until answerCallbackQuery runs.
    // Acknowledge first because inventory assignment and rate lookup may take a few seconds.
    await answerCallbackQuery(
      callback.id,
      match[1] === 'retry_inventory'
        ? 'Buscando un perfil disponible…'
        : 'Procesando confirmación…',
    );
    try {
      const result =
        match[1] === 'retry_inventory'
          ? await retryFulfillingOrderDelivery({
              publicId: match[2],
              adminCustomerId: admin.id,
              source: 'telegram',
            })
          : await confirmPaymentAndDeliver({
              publicId: match[2],
              adminCustomerId: admin.id,
              source: 'telegram',
              reviewNote: 'Pago confirmado desde el botón privado de Telegram.',
            });
      if (!result.ok) {
        await sendTelegramMessage(
          chatId,
          `⚠️ No se pudo completar ${match[2]}\n\n${result.message}`,
        );
      }
    } catch (error) {
      console.error(
        'telegram_payment_confirmation_failed',
        error instanceof Error ? error.message : 'Error desconocido',
      );
      await sendTelegramMessage(
        chatId,
        `⚠️ No se pudo procesar el pedido ${match[2]}. Inténtalo nuevamente.`,
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (!parsed.data.message?.text) {
    return NextResponse.json({ ok: true });
  }
  const chatId = parsed.data.message.chat.id;
  if (!allowedChats.has(chatId)) {
    return NextResponse.json({ ok: true });
  }

  const text = parsed.data.message.text.trim();
  const match = text.match(/^\/(pedido|token)(?:@\w+)?\s+(DP-\d{8}-[A-F0-9]{8})$/i);
  if (!match) {
    await sendTelegramMessage(
      chatId,
      'Comandos disponibles:\n/pedido DP-AAAAMMDD-XXXXXXXX\n/token DP-AAAAMMDD-XXXXXXXX',
    );
    return NextResponse.json({ ok: true });
  }
  const command = match[1].toLowerCase();
  const publicId = match[2].toUpperCase();
  const [order] = await db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      totalAmountMinor: purchaseOrders.totalAmountMinor,
      currency: purchaseOrders.currency,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.publicId, publicId))
    .limit(1);
  if (!order) {
    await sendTelegramMessage(chatId, `No encontré el pedido ${publicId}.`);
    return NextResponse.json({ ok: true });
  }

  if (command === 'pedido') {
    const total = new Intl.NumberFormat(order.currency === 'PEN' ? 'es-PE' : 'es-BO', {
      style: 'currency',
      currency: order.currency,
    }).format(order.totalAmountMinor / 100);
    await sendTelegramMessage(
      chatId,
      `Pedido: ${publicId}\nEstado: ${order.status}\nTotal: ${total}\n\nEl bot nunca envía correos, contraseñas ni PIN.`,
      ['pending_payment', 'payment_review'].includes(order.status)
        ? [
            [
              {
                text: '✅ Confirmar pago recibido',
                callback_data: `confirm_payment:${publicId}`,
              },
            ],
          ]
        : undefined,
    );
    return NextResponse.json({ ok: true });
  }

  const admin = await getTelegramAdmin();
  if (!admin) {
    await sendTelegramMessage(chatId, 'Falta configurar TELEGRAM_ADMIN_EMAIL.');
    return NextResponse.json({ ok: true });
  }

  const result = await issueDeliveryToken({
    publicId,
    adminCustomerId: admin.id,
    source: 'telegram',
  });
  if (!result.ok) {
    await sendTelegramMessage(chatId, `No se generó el token: ${result.error}`);
    return NextResponse.json({ ok: true });
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  await sendTelegramMessage(
    chatId,
    `Token para ${publicId}:\n${result.token}\n\nVence en 30 minutos y se usa una sola vez.${appUrl ? `\n${appUrl}/pedido/${publicId}` : ''}`,
  );
  return NextResponse.json({ ok: true });
}
