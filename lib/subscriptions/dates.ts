export type SubscriptionTone = 'active' | 'info' | 'warning' | 'danger' | 'muted';

const marketTimeZones = {
  PE: 'America/Lima',
  BO: 'America/La_Paz',
} as const;

export function todayForMarket(marketCode: 'PE' | 'BO', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: marketTimeZones[marketCode],
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function addMonths(dateIso: string, months: number) {
  const [year, month, day] = dateIso.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function formatCustomerDate(dateIso: string, marketCode: 'PE' | 'BO') {
  return new Intl.DateTimeFormat('es', {
    timeZone: marketTimeZones[marketCode],
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateIso}T12:00:00Z`));
}

export function getTimeStatus(
  startDate: string,
  expiresAt: string,
  marketCode: 'PE' | 'BO',
  persistedStatus: string,
  now = new Date(),
) {
  const daysRemaining = daysBetween(todayForMarket(marketCode, now), expiresAt);
  const totalDays = Math.max(1, daysBetween(startDate, expiresAt));
  const elapsedDays = Math.max(0, totalDays - Math.max(0, daysRemaining));
  const progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  if (persistedStatus === 'cancelled' || persistedStatus === 'suspended') {
    return {
      daysRemaining,
      progressPercent,
      tone: 'muted' as SubscriptionTone,
      stateLabel: persistedStatus === 'cancelled' ? 'Cancelada' : 'Suspendida',
      remainingLabel: persistedStatus === 'cancelled' ? 'Suscripción cancelada' : 'Suscripción suspendida',
    };
  }
  if (persistedStatus === 'pending') {
    return {
      daysRemaining,
      progressPercent: 0,
      tone: 'info' as SubscriptionTone,
      stateLabel: 'Pendiente',
      remainingLabel: 'Pendiente de activación',
    };
  }
  if (daysRemaining < 0) {
    const elapsed = Math.abs(daysRemaining);
    return {
      daysRemaining,
      progressPercent: 100,
      tone: 'muted' as SubscriptionTone,
      stateLabel: 'Vencida',
      remainingLabel: `Vencida hace ${elapsed} ${elapsed === 1 ? 'día' : 'días'}`,
    };
  }
  if (daysRemaining === 0) {
    return {
      daysRemaining,
      progressPercent: 100,
      tone: 'danger' as SubscriptionTone,
      stateLabel: 'Vence hoy',
      remainingLabel: 'Vence hoy',
    };
  }
  if (daysRemaining === 1) {
    return {
      daysRemaining,
      progressPercent,
      tone: 'danger' as SubscriptionTone,
      stateLabel: 'Por vencer',
      remainingLabel: '1 día restante',
    };
  }
  if (daysRemaining <= 3) {
    return {
      daysRemaining,
      progressPercent,
      tone: 'warning' as SubscriptionTone,
      stateLabel: 'Por vencer',
      remainingLabel: `${daysRemaining} días restantes`,
    };
  }
  if (daysRemaining <= 7) {
    return {
      daysRemaining,
      progressPercent,
      tone: 'info' as SubscriptionTone,
      stateLabel: 'Activa',
      remainingLabel: `${daysRemaining} días restantes`,
    };
  }
  return {
    daysRemaining,
    progressPercent,
    tone: 'active' as SubscriptionTone,
    stateLabel: 'Activa',
    remainingLabel: `${daysRemaining} días restantes`,
  };
}
