'use server';

import { and, eq, gt, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/db/client';
import {
  authSessions,
  customerNotifications,
  customers,
  offerVariants,
  renewalRequests,
  subscriptions,
} from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { requireCustomer } from '@/lib/auth/session';
import {
  changePasswordSchema,
  profileSchema,
  type AuthActionState,
  zodFieldErrors,
} from '@/lib/auth/validation';
import { addMonths, todayForMarket } from '@/lib/subscriptions/dates';

export type RenewalActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  requestId?: number;
};

export async function updateProfileAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const customer = await requireCustomer();
  const result = profileSchema.safeParse({ fullName: formData.get('fullName') });
  if (!result.success) return { status: 'error', fieldErrors: zodFieldErrors(result.error) };

  await db
    .update(customers)
    .set({ fullName: result.data.fullName, updatedAt: new Date() })
    .where(eq(customers.id, customer.id));
  revalidatePath('/mi-cuenta', 'layout');
  return { status: 'success', message: 'Tus datos se actualizaron correctamente.' };
}

export async function changePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const customer = await requireCustomer();
  const result = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    newPasswordConfirmation: formData.get('newPasswordConfirmation'),
  });
  if (!result.success) return { status: 'error', fieldErrors: zodFieldErrors(result.error) };

  const [record] = await db
    .select({ passwordHash: customers.passwordHash })
    .from(customers)
    .where(eq(customers.id, customer.id))
    .limit(1);
  if (!record || !(await verifyPassword(record.passwordHash, result.data.currentPassword))) {
    return {
      status: 'error',
      fieldErrors: { currentPassword: ['La contraseña actual no es correcta.'] },
    };
  }

  const passwordHash = await hashPassword(result.data.newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(customers.id, customer.id));
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.customerId, customer.id), isNull(authSessions.revokedAt)));
  });

  redirect('/ingresar?password=updated');
}

export async function markNotificationReadAction(formData: FormData) {
  const customer = await requireCustomer();
  const notificationId = Number(formData.get('notificationId'));
  if (!Number.isSafeInteger(notificationId)) return;

  await db
    .update(customerNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(customerNotifications.id, notificationId),
        eq(customerNotifications.customerId, customer.id),
      ),
    );
  revalidatePath('/mi-cuenta', 'layout');
}

export async function markAllNotificationsReadAction() {
  const customer = await requireCustomer();
  await db
    .update(customerNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(customerNotifications.customerId, customer.id),
        isNull(customerNotifications.readAt),
      ),
    );
  revalidatePath('/mi-cuenta', 'layout');
}

export async function createRenewalRequestAction(
  _previousState: RenewalActionState,
  formData: FormData,
): Promise<RenewalActionState> {
  const customer = await requireCustomer();
  const subscriptionId = Number(formData.get('subscriptionId'));
  const offerVariantId = Number(formData.get('offerVariantId'));
  if (!Number.isSafeInteger(subscriptionId) || !Number.isSafeInteger(offerVariantId)) {
    return { status: 'error', message: 'No pudimos validar la opción seleccionada.' };
  }

  const [record] = await db
    .select({
      subscriptionId: subscriptions.id,
      productId: subscriptions.productId,
      accessTypeCode: subscriptions.accessTypeCode,
      marketCode: subscriptions.marketCode,
      expiresAt: subscriptions.expiresAt,
      offerVariantId: offerVariants.id,
      durationMonths: offerVariants.durationMonths,
      amountMinor: offerVariants.amountMinor,
      currency: subscriptions.currency,
    })
    .from(subscriptions)
    .innerJoin(
      offerVariants,
      and(
        eq(offerVariants.id, offerVariantId),
        eq(offerVariants.productId, subscriptions.productId),
        eq(offerVariants.accessTypeCode, subscriptions.accessTypeCode),
        eq(offerVariants.marketCode, subscriptions.marketCode),
        eq(offerVariants.isActive, true),
        gt(offerVariants.stock, 0),
      ),
    )
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.customerId, customer.id),
      ),
    )
    .limit(1);

  if (!record || record.amountMinor === null) {
    return { status: 'error', message: 'La opción seleccionada ya no está disponible.' };
  }

  const marketCode = record.marketCode as 'PE' | 'BO';
  const today = todayForMarket(marketCode);
  const baseExpiresAt = record.expiresAt >= today ? record.expiresAt : today;
  const proposedStartDate = record.expiresAt >= today ? record.expiresAt : today;
  const proposedExpiresAt = addMonths(baseExpiresAt, record.durationMonths);

  const [existing] = await db
    .select({ id: renewalRequests.id })
    .from(renewalRequests)
    .where(
      and(
        eq(renewalRequests.subscriptionId, subscriptionId),
        eq(renewalRequests.customerId, customer.id),
        eq(renewalRequests.status, 'pending_payment'),
      ),
    )
    .limit(1);

  let requestId: number;
  if (existing) {
    await db
      .update(renewalRequests)
      .set({
        offerVariantId: record.offerVariantId,
        baseExpiresAt,
        proposedStartDate,
        proposedExpiresAt,
        priceMinor: record.amountMinor,
        currency: record.currency,
        updatedAt: new Date(),
      })
      .where(eq(renewalRequests.id, existing.id));
    requestId = existing.id;
  } else {
    const [created] = await db
      .insert(renewalRequests)
      .values({
        subscriptionId,
        customerId: customer.id,
        offerVariantId: record.offerVariantId,
        baseExpiresAt,
        proposedStartDate,
        proposedExpiresAt,
        priceMinor: record.amountMinor,
        currency: record.currency,
      })
      .returning({ id: renewalRequests.id });
    if (!created) return { status: 'error', message: 'No pudimos preparar la renovación.' };
    requestId = created.id;
  }

  revalidatePath(`/mi-cuenta/suscripciones/${subscriptionId}`);
  revalidatePath('/mi-cuenta');
  return {
    status: 'success',
    requestId,
    message: 'Renovación preparada. Conservaremos tus días actuales hasta confirmar el pago.',
  };
}
