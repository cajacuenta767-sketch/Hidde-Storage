import 'server-only';

import { and, eq, gte, inArray, lt, lte } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  customerNotifications,
  purchaseOrders,
  subscriptions,
} from '@/db/schema';
import { expirePurchaseOrder } from '@/lib/orders/status';
import { releaseExpiredProfileReservationsQuery } from '@/lib/orders/reservations';
import { formatCustomerDate, todayForMarket } from '@/lib/subscriptions/dates';

export type MaintenanceSummary = {
  expiredOrders: number;
  expiredSubscriptions: number;
  markedExpiring: number;
  renewalReminders: number;
};

function addDays(dateIso: string, days: number) {
  const [year, month, day] = dateIso.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days));
  return target.toISOString().slice(0, 10);
}

const reminderMessages: Record<number, (date: string) => string> = {
  7: (date) => `Tu plan vence el ${date}. Renueva con tiempo y conserva tus días.`,
  3: (date) => `Quedan 3 días: tu plan vence el ${date}. Renueva para no perder el acceso.`,
  1: (date) => `Último día completo: tu plan vence el ${date}. Renueva hoy mismo.`,
  0: (date) => `Tu plan vence hoy (${date}). Renueva ahora para mantener tu acceso.`,
};

export async function runDailyMaintenance(): Promise<MaintenanceSummary> {
  const summary: MaintenanceSummary = {
    expiredOrders: 0,
    expiredSubscriptions: 0,
    markedExpiring: 0,
    renewalReminders: 0,
  };

  // 1. Pedidos no pagados con más de 24 horas.
  const overdueOrders = await db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.status, 'pending_payment'),
        lt(purchaseOrders.expiresAt, new Date()),
      ),
    );
  for (const order of overdueOrders) {
    await expirePurchaseOrder(order.id);
    summary.expiredOrders += 1;
  }

  // 2. Reservas de perfil vencidas.
  await db.execute(releaseExpiredProfileReservationsQuery());

  for (const marketCode of ['PE', 'BO'] as const) {
    const today = todayForMarket(marketCode);

    // 3. Suscripciones vencidas.
    const expired = await db
      .update(subscriptions)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.marketCode, marketCode),
          inArray(subscriptions.status, ['active', 'expiring']),
          lt(subscriptions.expiresAt, today),
        ),
      )
      .returning({ id: subscriptions.id });
    summary.expiredSubscriptions += expired.length;

    // 4. Suscripciones que entran en ventana de renovación (7 días).
    const expiring = await db
      .update(subscriptions)
      .set({ status: 'expiring', updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.marketCode, marketCode),
          eq(subscriptions.status, 'active'),
          gte(subscriptions.expiresAt, today),
          lte(subscriptions.expiresAt, addDays(today, 7)),
        ),
      )
      .returning({ id: subscriptions.id });
    summary.markedExpiring += expiring.length;

    // 5. Recordatorios de renovación a 7 / 3 / 1 / 0 días, sin duplicados.
    const reminderDays = [7, 3, 1, 0] as const;
    const targets = new Map(
      reminderDays.map((days) => [addDays(today, days), days]),
    );
    const dueSoon = await db
      .select({
        id: subscriptions.id,
        customerId: subscriptions.customerId,
        expiresAt: subscriptions.expiresAt,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.marketCode, marketCode),
          inArray(subscriptions.status, ['active', 'expiring']),
          inArray(subscriptions.expiresAt, Array.from(targets.keys())),
        ),
      );
    for (const subscription of dueSoon) {
      const days = targets.get(subscription.expiresAt);
      if (days === undefined) continue;
      const message = reminderMessages[days](
        formatCustomerDate(subscription.expiresAt, marketCode),
      );
      const inserted = await db
        .insert(customerNotifications)
        .values({
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          type: days <= 1 ? 'expiry_urgent' : 'expiry_reminder',
          title:
            days === 0
              ? 'Tu suscripción vence hoy'
              : `Tu suscripción vence en ${days} ${days === 1 ? 'día' : 'días'}`,
          message,
          dedupKey: `expiry:${subscription.id}:${subscription.expiresAt}:${days}`,
        })
        .onConflictDoNothing()
        .returning({ id: customerNotifications.id });
      summary.renewalReminders += inserted.length;
    }
  }

  return summary;
}
