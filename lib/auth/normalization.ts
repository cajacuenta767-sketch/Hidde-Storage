export type SupportedMarket = 'PE' | 'BO';

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('es');
}

export function normalizePhone(value: string, market: SupportedMarket) {
  const digits = value.replace(/\D/g, '');

  if (market === 'PE') {
    const local = digits.startsWith('51') ? digits.slice(2) : digits;
    return /^9\d{8}$/.test(local) ? `+51${local}` : null;
  }

  const local = digits.startsWith('591') ? digits.slice(3) : digits;
  return /^[67]\d{7}$/.test(local) ? `+591${local}` : null;
}

export function normalizeLoginIdentifier(value: string) {
  const normalized = value.trim();
  if (normalized.includes('@')) return normalizeEmail(normalized);

  const digits = normalized.replace(/\D/g, '');
  if (digits.startsWith('51') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('591') && digits.length === 11) return `+${digits}`;
  if (/^9\d{8}$/.test(digits)) return `+51${digits}`;
  if (/^[67]\d{7}$/.test(digits)) return `+591${digits}`;
  return normalized;
}

export function customerInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');
}
