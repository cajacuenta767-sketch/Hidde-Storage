import 'server-only';

import { hash, verify, type Options } from '@node-rs/argon2';

const passwordPolicy = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} satisfies Options;

export function hashPassword(password: string) {
  return hash(password, passwordPolicy);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, passwordPolicy);
}
