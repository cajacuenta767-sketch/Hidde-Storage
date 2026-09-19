import 'server-only';

import { createHash } from 'node:crypto';
import { eq, and } from 'drizzle-orm';

import { db } from '@/db/client';
import { authRateLimits } from '@/db/schema';

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function identifierHash(identifier: string, action: string) {
  return createHash('sha256').update(`${action}:${identifier}`).digest('hex');
}

export async function checkAuthRateLimit(identifier: string, action: string) {
  const key = identifierHash(identifier, action);
  const [record] = await db
    .select()
    .from(authRateLimits)
    .where(and(eq(authRateLimits.identifierHash, key), eq(authRateLimits.action, action)))
    .limit(1);

  if (!record) return { allowed: true, key };
  const now = Date.now();
  if (record.blockedUntil && record.blockedUntil.getTime() > now) {
    return { allowed: false, key };
  }

  if (record.windowStartedAt.getTime() + WINDOW_MS <= now) {
    await db
      .update(authRateLimits)
      .set({ attempts: 0, windowStartedAt: new Date(), blockedUntil: null, updatedAt: new Date() })
      .where(eq(authRateLimits.id, record.id));
  }

  return { allowed: true, key };
}

export async function registerAuthFailure(key: string, action: string) {
  const [record] = await db
    .select()
    .from(authRateLimits)
    .where(and(eq(authRateLimits.identifierHash, key), eq(authRateLimits.action, action)))
    .limit(1);
  const now = new Date();

  if (!record) {
    await db.insert(authRateLimits).values({
      identifierHash: key,
      action,
      attempts: 1,
      windowStartedAt: now,
    });
    return;
  }

  const attempts = record.attempts + 1;
  await db
    .update(authRateLimits)
    .set({
      attempts,
      blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : null,
      updatedAt: now,
    })
    .where(eq(authRateLimits.id, record.id));
}

export async function clearAuthFailures(key: string, action: string) {
  await db
    .delete(authRateLimits)
    .where(and(eq(authRateLimits.identifierHash, key), eq(authRateLimits.action, action)));
}
