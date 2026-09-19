import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  adminAuditEvents,
  accountProfiles,
  customerNotifications,
  deliveryTokens,
  purchaseOrderItems,
  purchaseOrders,
  profileAssignments,
  serviceAccounts,
  subscriptionEvents,
  subscriptions,
} from '@/db/schema';

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function tokenSecret() {
  const secret =
    process.env.DORAPASS_DELIVERY_TOKEN_SECRET ??
    process.env.DORAPASS_CREDENTIALS_KEY;
  if (!secret) throw new Error('Falta configurar el secreto de tokens de entrega.');
  return secret;
}

export function normalizeDeliveryToken(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function hashDeliveryToken(token: string) {
  return createHmac('sha256', tokenSecret()).update(token).digest('hex');
}

function createReadableToken() {
  const bytes = randomBytes(8);
  let body = '';
  for (let index = 0; index < 8; index += 1) {
    body += TOKEN_ALPHABET[bytes[index] % TOKEN_ALPHABET.length];
  }
  return `DP-${body.slice(0, 4)}-${body.slice(4)}`;
}

export async function issueDeliveryToken(input: {
  publicId: string;
  adminCustomerId: number;
  source: 'admin' | 'telegram';
}) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.publicId, input.publicId))
      .limit(1);
    if (!order) return { ok: false as const, error: 'El pedido no existe.' };
    if (!['paid', 'token_issued'].includes(order.status)) {
      return {
        ok: false as const,
        error: 'Primero confirma el pago y asigna todos los accesos.',
      };
    }

    const items = await tx
      .select({ subscriptionId: purchaseOrderItems.subscriptionId })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, order.id));
    if (!items.length || items.some((item) => !item.subscriptionId)) {
      return {
        ok: false as const,
        error: 'Todavía hay productos sin acceso asignado.',
      };
    }

    await tx
      .update(deliveryTokens)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(
        and(
          eq(deliveryTokens.orderId, order.id),
          eq(deliveryTokens.status, 'active'),
        ),
      );

    const token = createReadableToken();
    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
    await tx.insert(deliveryTokens).values({
      orderId: order.id,
      tokenHash: hashDeliveryToken(token),
      expiresAt,
      generatedByAdminCustomerId: input.adminCustomerId,
      source: input.source,
    });
    await tx
      .update(purchaseOrders)
      .set({ status: 'token_issued', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, order.id));
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: input.adminCustomerId,
      action: 'delivery_token_issued',
      entityType: 'purchase_order',
      entityId: order.id,
      summary: `Token de entrega emitido desde ${input.source}.`,
    });
    return { ok: true as const, token, expiresAt };
  });
}

export async function redeemDeliveryToken(input: {
  publicId: string;
  customerId: number;
  token: string;
}) {
  const normalized = normalizeDeliveryToken(input.token);
  if (!/^DP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(normalized)) {
    return { ok: false as const, error: 'El token no tiene un formato válido.' };
  }
  const submittedHash = hashDeliveryToken(normalized);

  return db.transaction(async (tx) => {
    const orders = await tx.execute<{
      id: number;
      status: string;
    }>(sql`
      select id, status from purchase_orders
      where public_id = ${input.publicId} and customer_id = ${input.customerId}
      for update
    `);
    const order = orders[0];
    if (!order) return { ok: false as const, error: 'Pedido no encontrado.' };
    if (order.status === 'delivered') {
      return { ok: false as const, error: 'Este pedido ya fue entregado.' };
    }
    if (order.status !== 'token_issued') {
      return {
        ok: false as const,
        error: 'El pago aún no fue confirmado o el token todavía no fue emitido.',
      };
    }

    const tokens = await tx.execute<{
      id: number;
      tokenHash: string;
      attempts: number;
      maxAttempts: number;
      expiresAt: Date;
    }>(sql`
      select id, token_hash as "tokenHash", attempts,
             max_attempts as "maxAttempts", expires_at as "expiresAt"
      from delivery_tokens
      where order_id = ${order.id} and status = 'active'
      order by created_at desc
      for update
      limit 1
    `);
    const record = tokens[0];
    if (!record) {
      return { ok: false as const, error: 'No existe un token activo para este pedido.' };
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      await tx
        .update(deliveryTokens)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(deliveryTokens.id, record.id));
      return { ok: false as const, error: 'El token venció. Solicita uno nuevo.' };
    }

    const expected = Buffer.from(record.tokenHash, 'hex');
    const submitted = Buffer.from(submittedHash, 'hex');
    const matches =
      expected.length === submitted.length && timingSafeEqual(expected, submitted);
    if (!matches) {
      const attempts = record.attempts + 1;
      const exhausted = attempts >= record.maxAttempts;
      await tx
        .update(deliveryTokens)
        .set({
          attempts,
          status: exhausted ? 'revoked' : 'active',
          updatedAt: new Date(),
        })
        .where(eq(deliveryTokens.id, record.id));
      return {
        ok: false as const,
        error: exhausted
          ? 'Token bloqueado por demasiados intentos. Solicita uno nuevo.'
          : `Token incorrecto. Te quedan ${record.maxAttempts - attempts} intento(s).`,
      };
    }

    const items = await tx
      .select({
        subscriptionId: purchaseOrderItems.subscriptionId,
        serviceName: purchaseOrderItems.serviceName,
        planName: purchaseOrderItems.planName,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, order.id))
      .orderBy(asc(purchaseOrderItems.id));
    const subscriptionIds = items.flatMap((item) =>
      item.subscriptionId ? [item.subscriptionId] : [],
    );
    if (subscriptionIds.length !== items.length) {
      return { ok: false as const, error: 'El acceso todavía se está preparando.' };
    }

    const now = new Date();
    await tx
      .update(deliveryTokens)
      .set({ status: 'used', usedAt: now, updatedAt: now })
      .where(eq(deliveryTokens.id, record.id));
    await tx
      .update(subscriptions)
      .set({ status: 'active', updatedAt: now })
      .where(inArray(subscriptions.id, subscriptionIds));
    await tx
      .update(purchaseOrders)
      .set({ status: 'delivered', fulfilledAt: now, updatedAt: now })
      .where(eq(purchaseOrders.id, order.id));
    for (const subscriptionId of subscriptionIds) {
      await tx.insert(subscriptionEvents).values({
        subscriptionId,
        eventType: 'access_released_with_token',
        description: `Acceso liberado con token para ${input.publicId}`,
      });
    }
    await tx.insert(customerNotifications).values({
      customerId: input.customerId,
      type: 'purchase_delivered',
      title: 'Tu compra está lista',
      message: `El acceso del pedido ${input.publicId} ya está disponible.`,
      dedupKey: `purchase:${order.id}:delivered`,
    });

    const totpAccounts = await tx
      .select({ subscriptionId: profileAssignments.subscriptionId })
      .from(profileAssignments)
      .innerJoin(accountProfiles, eq(profileAssignments.accountProfileId, accountProfiles.id))
      .innerJoin(serviceAccounts, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
      .where(
        and(
          inArray(profileAssignments.subscriptionId, subscriptionIds),
          eq(profileAssignments.status, 'active'),
          sql`${serviceAccounts.encryptedTotpSecret} is not null and ${serviceAccounts.totpSecretIv} is not null`,
        ),
      );
    const totpSubscriptionIds = new Set(totpAccounts.map((row) => row.subscriptionId));
    const emailOtpAccounts = await tx
      .select({ subscriptionId: profileAssignments.subscriptionId })
      .from(profileAssignments)
      .innerJoin(accountProfiles, eq(profileAssignments.accountProfileId, accountProfiles.id))
      .innerJoin(serviceAccounts, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
      .where(
        and(
          inArray(profileAssignments.subscriptionId, subscriptionIds),
          eq(profileAssignments.status, 'active'),
          sql`${serviceAccounts.encryptedOtpInboxEmail} is not null and ${serviceAccounts.encryptedOtpInboxPassword} is not null`,
        ),
      );
    const emailOtpSubscriptionIds = new Set(emailOtpAccounts.map((row) => row.subscriptionId));

    return {
      ok: true as const,
      items: items.map((item) => ({
        subscriptionId: item.subscriptionId as number,
        serviceName: item.serviceName,
        planName: item.planName,
        hasTotp: totpSubscriptionIds.has(item.subscriptionId as number),
        hasEmailOtp: emailOtpSubscriptionIds.has(item.subscriptionId as number),
      })),
    };
  });
}
