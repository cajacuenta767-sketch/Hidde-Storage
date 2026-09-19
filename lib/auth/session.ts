import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db/client';
import { authSessions, customers } from '@/db/schema';
import { customerInitials } from '@/lib/auth/normalization';

export const SESSION_COOKIE_NAME = 'dorapass_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function hashIp(ip: string) {
  return ip ? createHash('sha256').update(ip).digest('hex') : null;
}

export async function createCustomerSession(customerId: number) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

  await db.insert(authSessions).values({
    customerId,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: requestHeaders.get('user-agent')?.slice(0, 500) ?? null,
    ipHash: hashIp(forwardedFor),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export type CurrentCustomer = {
  id: number;
  fullName: string;
  firstName: string;
  initials: string;
  email: string;
  phoneE164: string;
  marketCode: 'PE' | 'BO';
  role: 'customer' | 'admin';
};

export const getCurrentCustomer = cache(async (): Promise<CurrentCustomer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const [record] = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phoneE164: customers.phoneE164,
      marketCode: customers.marketCode,
      role: customers.role,
    })
    .from(authSessions)
    .innerJoin(customers, eq(authSessions.customerId, customers.id))
    .where(
      and(
        eq(authSessions.tokenHash, hashToken(token)),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date()),
        eq(customers.status, 'active'),
      ),
    )
    .limit(1);

  if (!record) return null;
  return {
    ...record,
    marketCode: record.marketCode as 'PE' | 'BO',
    role: record.role as 'customer' | 'admin',
    firstName: record.fullName.trim().split(/\s+/)[0] ?? record.fullName,
    initials: customerInitials(record.fullName),
  };
});

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect('/ingresar?next=/mi-cuenta');
  if (customer.role !== 'customer') redirect('/admin');
  return customer;
}

export async function requireAdmin() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect('/ingresar?next=/admin');
  if (customer.role !== 'admin') redirect('/mi-cuenta');
  return customer;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.tokenHash, hashToken(token)), isNull(authSessions.revokedAt)));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function destroyAllCustomerSessions(customerId: number) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.customerId, customerId), isNull(authSessions.revokedAt)));
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
