'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/session';
import { notifyTelegramTokenIssued } from '@/lib/integrations/telegram';
import {
  confirmPaymentAndDeliver,
  retryFulfillingOrderDelivery,
} from '@/lib/orders/confirmation';
import { issueDeliveryToken } from '@/lib/orders/delivery';

export type PurchaseConfirmationState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
};

export type DeliveryTokenState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  token?: string;
  expiresAt?: string;
};

const schema = z.object({
  publicId: z.string().regex(/^DP-\d{8}-[A-F0-9]{8}$/),
  reviewNote: z.string().trim().max(300).optional(),
});

export async function confirmPurchasePaymentAction(
  _previous: PurchaseConfirmationState,
  formData: FormData,
): Promise<PurchaseConfirmationState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse({
    publicId: formData.get('publicId'),
    reviewNote: formData.get('reviewNote') || undefined,
  });
  if (!parsed.success) {
    return { status: 'error', message: 'No pudimos validar el pedido.' };
  }

  try {
    const result = await confirmPaymentAndDeliver({
      publicId: parsed.data.publicId,
      adminCustomerId: admin.id,
      source: 'admin',
      reviewNote: parsed.data.reviewNote,
    });
    if (!result.ok) return { status: 'error', message: result.message };
    revalidatePath('/admin', 'layout');
    revalidatePath('/mi-cuenta', 'layout');
    revalidatePath(`/pedido/${parsed.data.publicId}`);
    return { status: 'success', message: result.message };
  } catch (error) {
    console.error(
      'purchase_payment_confirmation_failed',
      error instanceof Error ? error.message : 'Error desconocido',
    );
    return {
      status: 'error',
      message: 'No pudimos confirmar el pago. Intenta nuevamente.',
    };
  }
}

export async function retryPurchaseDeliveryAction(
  _previous: PurchaseConfirmationState,
  formData: FormData,
): Promise<PurchaseConfirmationState> {
  const admin = await requireAdmin();
  const parsed = tokenSchema.safeParse({ publicId: formData.get('publicId') });
  if (!parsed.success) {
    return { status: 'error', message: 'No pudimos validar el pedido.' };
  }
  try {
    const result = await retryFulfillingOrderDelivery({
      publicId: parsed.data.publicId,
      adminCustomerId: admin.id,
      source: 'admin',
    });
    revalidatePath('/admin', 'layout');
    revalidatePath('/mi-cuenta', 'layout');
    revalidatePath(`/pedido/${parsed.data.publicId}`);
    return {
      status: result.ok ? 'success' : 'error',
      message: result.message,
    };
  } catch (error) {
    console.error(
      'purchase_inventory_retry_failed',
      error instanceof Error ? error.message : 'Error desconocido',
    );
    return {
      status: 'error',
      message: 'No pudimos reintentar la asignación. Intenta nuevamente.',
    };
  }
}

const tokenSchema = z.object({
  publicId: z.string().regex(/^DP-\d{8}-[A-F0-9]{8}$/),
});

export async function issueDeliveryTokenAction(
  _previous: DeliveryTokenState,
  formData: FormData,
): Promise<DeliveryTokenState> {
  const admin = await requireAdmin();
  const parsed = tokenSchema.safeParse({ publicId: formData.get('publicId') });
  if (!parsed.success) {
    return { status: 'error', message: 'No pudimos validar el pedido.' };
  }
  const result = await issueDeliveryToken({
    publicId: parsed.data.publicId,
    adminCustomerId: admin.id,
    source: 'admin',
  });
  if (!result.ok) return { status: 'error', message: result.error };
  await notifyTelegramTokenIssued({
    publicId: parsed.data.publicId,
    token: result.token,
    expiresAt: result.expiresAt,
  });
  revalidatePath('/admin', 'layout');
  revalidatePath(`/pedido/${parsed.data.publicId}`);
  return {
    status: 'success',
    message: 'Token creado y enviado a Telegram.',
    token: result.token,
    expiresAt: result.expiresAt.toISOString(),
  };
}
