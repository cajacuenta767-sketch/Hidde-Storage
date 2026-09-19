'use server';

import { and, count, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db/client';
import {
  adminAuditEvents,
  customerNotifications,
  offerVariants,
  products,
  stockRequests,
} from '@/db/schema';
import { checkAuthRateLimit, registerAuthFailure } from '@/lib/auth/rate-limit';
import { getCurrentCustomer, requireAdmin } from '@/lib/auth/session';
import { notifyTelegramStockRequested } from '@/lib/integrations/telegram';

export type StockAlertState = {
  status: 'idle' | 'success' | 'error' | 'unauthenticated';
  message?: string;
};

export type StockRestockState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

async function getRequestableVariant(offerVariantId: number) {
  const [variant] = await db
    .select({
      id: offerVariants.id,
      productId: offerVariants.productId,
      accessTypeCode: offerVariants.accessTypeCode,
      durationMonths: offerVariants.durationMonths,
      marketCode: offerVariants.marketCode,
      amountMinor: offerVariants.amountMinor,
      stock: offerVariants.stock,
      serviceName: products.serviceName,
      planName: products.planName,
    })
    .from(offerVariants)
    .innerJoin(products, eq(products.id, offerVariants.productId))
    .where(
      and(
        eq(offerVariants.id, offerVariantId),
        eq(offerVariants.isActive, true),
        eq(products.isActive, true),
      ),
    )
    .limit(1);
  if (!variant) return null;
  if (variant.marketCode !== 'PE' && variant.marketCode !== 'BO') return null;
  return { ...variant, marketCode: variant.marketCode as 'PE' | 'BO' };
}

function formatVariantPrice(marketCode: 'PE' | 'BO', amountMinor: number | null) {
  if (amountMinor === null) return null;
  return new Intl.NumberFormat(marketCode === 'PE' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency: marketCode === 'PE' ? 'PEN' : 'BOB',
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export async function requestStockAlertAction(
  offerVariantId: number,
): Promise<StockAlertState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { status: 'unauthenticated' };
  if (!Number.isSafeInteger(offerVariantId)) {
    return { status: 'error', message: 'No pudimos validar la opción seleccionada.' };
  }

  const rate = await checkAuthRateLimit(String(customer.id), 'stock_request');
  if (!rate.allowed) {
    return {
      status: 'error',
      message: 'Registraste varias solicitudes seguidas. Inténtalo de nuevo en unos minutos.',
    };
  }

  const variant = await getRequestableVariant(offerVariantId);
  if (!variant) {
    return { status: 'error', message: 'La opción seleccionada ya no está disponible.' };
  }
  if (variant.stock > 0) {
    return {
      status: 'error',
      message: 'Esta opción volvió a tener stock. Recarga la página para comprarla.',
    };
  }

  await registerAuthFailure(rate.key, 'stock_request');

  const inserted = await db
    .insert(stockRequests)
    .values({
      customerId: customer.id,
      productId: variant.productId,
      offerVariantId: variant.id,
      marketCode: variant.marketCode,
    })
    .onConflictDoNothing()
    .returning({ id: stockRequests.id });

  if (inserted.length === 0) {
    return {
      status: 'success',
      message: 'Ya registramos tu solicitud. Te avisaremos cuando vuelva el stock.',
    };
  }

  const [pending] = await db
    .select({ total: count() })
    .from(stockRequests)
    .where(
      and(
        eq(stockRequests.offerVariantId, variant.id),
        eq(stockRequests.status, 'pending'),
      ),
    );
  await notifyTelegramStockRequested({
    serviceName: variant.serviceName,
    planName: variant.planName,
    accessTypeCode: variant.accessTypeCode,
    durationMonths: variant.durationMonths,
    marketCode: variant.marketCode,
    priceLabel: formatVariantPrice(variant.marketCode, variant.amountMinor),
    customerName: customer.fullName,
    customerEmail: customer.email,
    customerPhone: customer.phoneE164 || null,
    pendingCount: pending?.total ?? 1,
  });

  return {
    status: 'success',
    message: 'Listo. Avisamos al equipo y te notificaremos cuando vuelva el stock.',
  };
}

export async function restockAndNotifyAction(
  _previousState: StockRestockState,
  formData: FormData,
): Promise<StockRestockState> {
  const admin = await requireAdmin();
  const offerVariantId = Number(formData.get('offerVariantId'));
  const stock = Number(formData.get('stock'));
  if (!Number.isSafeInteger(offerVariantId) || !Number.isSafeInteger(stock) || stock < 0) {
    return { status: 'error', message: 'Indica un stock válido (0 o más).' };
  }

  const variant = await getRequestableVariant(offerVariantId);
  if (!variant) {
    return { status: 'error', message: 'La variante ya no existe o está inactiva.' };
  }

  const notified = await db.transaction(async (tx) => {
    await tx
      .update(offerVariants)
      .set({ stock, updatedAt: new Date() })
      .where(eq(offerVariants.id, variant.id));

    let requestIds: number[] = [];
    if (stock > 0) {
      const pending = await tx
        .select({ id: stockRequests.id, customerId: stockRequests.customerId })
        .from(stockRequests)
        .where(
          and(
            eq(stockRequests.offerVariantId, variant.id),
            eq(stockRequests.status, 'pending'),
          ),
        );
      requestIds = pending.map((request) => request.id);
      if (requestIds.length > 0) {
        await tx
          .update(stockRequests)
          .set({
            status: 'fulfilled',
            resolvedAt: new Date(),
            resolvedByAdminCustomerId: admin.id,
            updatedAt: new Date(),
          })
          .where(inArray(stockRequests.id, requestIds));
        await tx.insert(customerNotifications).values(
          pending.map((request) => ({
            customerId: request.customerId,
            type: 'stock_available',
            title: `${variant.serviceName} volvió a tener stock`,
            message:
              `${variant.serviceName} — ${variant.planName} (${variant.accessTypeCode === 'PROFILE' ? 'perfil' : 'cuenta completa'}, ` +
              `${variant.durationMonths} mes(es)) ya está disponible. Entra al catálogo para comprarlo.`,
            dedupKey: `stock:${request.id}:available`,
          })),
        );
      }
    }

    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'stock_restocked',
      entityType: 'offer_variant',
      entityId: variant.id,
      summary:
        `Stock de ${variant.serviceName} — ${variant.planName} (${variant.marketCode}) actualizado a ${stock}. ` +
        `${requestIds.length} cliente(s) avisado(s).`,
    });
    return requestIds.length;
  });

  revalidatePath('/admin/solicitudes');
  revalidatePath('/');
  return {
    status: 'success',
    message:
      stock > 0
        ? `Stock actualizado a ${stock}. ${notified} cliente(s) recibieron el aviso de disponibilidad.`
        : 'Stock actualizado a 0. No se envió ningún aviso.',
  };
}

export async function dismissStockRequestsAction(formData: FormData) {
  const admin = await requireAdmin();
  const offerVariantId = Number(formData.get('offerVariantId'));
  if (!Number.isSafeInteger(offerVariantId)) return;

  await db.transaction(async (tx) => {
    const pending = await tx
      .select({ id: stockRequests.id })
      .from(stockRequests)
      .where(
        and(
          eq(stockRequests.offerVariantId, offerVariantId),
          eq(stockRequests.status, 'pending'),
        ),
      );
    if (pending.length === 0) return;
    await tx
      .update(stockRequests)
      .set({
        status: 'dismissed',
        resolvedAt: new Date(),
        resolvedByAdminCustomerId: admin.id,
        updatedAt: new Date(),
      })
      .where(
        inArray(
          stockRequests.id,
          pending.map((request) => request.id),
        ),
      );
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'stock_requests_dismissed',
      entityType: 'offer_variant',
      entityId: offerVariantId,
      summary: `${pending.length} solicitud(es) de stock descartadas sin aviso al cliente.`,
    });
  });

  revalidatePath('/admin/solicitudes');
}
