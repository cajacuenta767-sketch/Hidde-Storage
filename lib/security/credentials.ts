import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getEncryptionKey() {
  const configured = process.env.DORAPASS_CREDENTIALS_KEY;
  if (!configured) {
    throw new Error('DORAPASS_CREDENTIALS_KEY no está configurada.');
  }

  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) {
    throw new Error('DORAPASS_CREDENTIALS_KEY debe contener exactamente 32 bytes en base64.');
  }
  return key;
}

export function encryptCredential(value: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const payload = Buffer.concat([ciphertext, cipher.getAuthTag()]);

  return {
    encryptedValue: payload.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decryptCredential(encryptedValue: string, encodedIv: string) {
  const payload = Buffer.from(encryptedValue, 'base64');
  const iv = Buffer.from(encodedIv, 'base64');
  if (iv.length !== IV_BYTES || payload.length <= AUTH_TAG_BYTES) {
    throw new Error('La credencial cifrada no tiene un formato válido.');
  }

  const ciphertext = payload.subarray(0, -AUTH_TAG_BYTES);
  const authTag = payload.subarray(-AUTH_TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function maskEmail(email: string) {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) return maskSecret(email, 2);
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${'•'.repeat(Math.max(4, localPart.length - visible.length))}@${domain}`;
}

export function maskSecret(value: string, visibleTail = 0) {
  const tail = visibleTail > 0 ? value.slice(-visibleTail) : '';
  return `${'•'.repeat(Math.max(6, value.length - tail.length))}${tail}`;
}
