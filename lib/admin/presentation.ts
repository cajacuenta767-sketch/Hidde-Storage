export const renewalStatusMeta: Record<
  string,
  { label: string; tone: 'info' | 'warning' | 'active' | 'muted' }
> = {
  pending_payment: { label: 'Pendiente de pago', tone: 'warning' },
  payment_review: { label: 'Comprobante en revisión', tone: 'info' },
  approved: { label: 'Aprobada', tone: 'active' },
  cancelled: { label: 'Cancelada', tone: 'muted' },
};

export function formatAdminMoney(amountMinor: number, currency: string) {
  const locale = currency === 'PEN' ? 'es-PE' : 'es-BO';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function formatAdminDate(value: string | Date | null, includeTime = false) {
  if (!value) return 'Sin registro';
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00Z`) : value;
  return new Intl.DateTimeFormat('es', {
    timeZone: 'America/La_Paz',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}
