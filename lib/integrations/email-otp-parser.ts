const OTP_PATTERNS = [
  /(?:sign[ -]?in|login|verification|security|access)\s+(?:code|otp)[^0-9]{0,80}([0-9]{4,8})/i,
  /(?:c[oó]digo|clave)\s+(?:de\s+)?(?:acceso|inicio|verificaci[oó]n)[^0-9]{0,80}([0-9]{4,8})/i,
  /(?:code|otp|c[oó]digo)[^0-9]{0,40}([0-9]{4,8})/i,
];

export function extractEmailOtp(value: string) {
  const text = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  for (const pattern of OTP_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isAllowedNetflixSender(address: string) {
  const normalized = address.trim().toLowerCase();
  const domain = normalized.split('@').at(-1) ?? '';
  return domain === 'netflix.com' || domain.endsWith('.netflix.com');
}
