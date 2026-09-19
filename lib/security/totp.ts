import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function normalizeTotpSecret(value: string) {
  const normalized = value.toUpperCase().replace(/[\s=-]/g, '');
  if (normalized.length < 16 || normalized.length > 128) {
    throw new Error('La clave TOTP debe tener entre 16 y 128 caracteres.');
  }
  for (const character of normalized) {
    if (BASE32_ALPHABET.includes(character)) continue;
    throw new Error('La clave TOTP no tiene un formato Base32 válido.');
  }
  return normalized;
}

function decodeBase32(value: string) {
  const normalized = normalizeTotpSecret(value);
  let bits = '';
  for (const character of normalized) {
    bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotp(
  secret: string,
  now = Date.now(),
  options: { period?: number; digits?: number } = {},
) {
  const period = options.period ?? 30;
  const digits = options.digits ?? 6;
  const counter = Math.floor(now / 1000 / period);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const code = String(binary % 10 ** digits).padStart(digits, '0');
  const expiresAt = (counter + 1) * period * 1000;
  return { code, period, expiresAt };
}
