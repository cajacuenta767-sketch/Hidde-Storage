'use server';

import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db } from '@/db/client';
import {
  authSessions,
  customers,
  passwordResetTokens,
} from '@/db/schema';
import { normalizeEmail, normalizeLoginIdentifier, normalizePhone } from '@/lib/auth/normalization';
import { sendPasswordResetEmail } from '@/lib/integrations/email';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  checkAuthRateLimit,
  clearAuthFailures,
  registerAuthFailure,
} from '@/lib/auth/rate-limit';
import {
  createCustomerSession,
  destroyAllCustomerSessions,
  destroyCurrentSession,
  requireCustomer,
} from '@/lib/auth/session';
import {
  type AuthActionState,
  loginSchema,
  recoverySchema,
  registrationSchema,
  resetPasswordSchema,
  safeNextPath,
  zodFieldErrors,
} from '@/lib/auth/validation';

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = registrationSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    marketCode: formData.get('marketCode'),
    password: formData.get('password'),
    passwordConfirmation: formData.get('passwordConfirmation'),
    terms: formData.get('terms'),
  });

  if (!result.success) return { status: 'error', fieldErrors: zodFieldErrors(result.error) };

  const email = normalizeEmail(result.data.email);
  const phoneE164 = normalizePhone(result.data.phone, result.data.marketCode);
  if (!phoneE164) {
    return {
      status: 'error',
      fieldErrors: { phone: ['Escribe un WhatsApp válido para el país seleccionado.'] },
    };
  }

  const existing = await db
    .select({ email: customers.email, phoneE164: customers.phoneE164 })
    .from(customers)
    .where(or(eq(customers.email, email), eq(customers.phoneE164, phoneE164)))
    .limit(1);

  if (existing.length > 0) {
    return {
      status: 'error',
      message: 'Ya existe una cuenta con ese correo o WhatsApp. Intenta iniciar sesión.',
    };
  }

  const passwordHash = await hashPassword(result.data.password);
  let customerId: number;

  try {
    const [customer] = await db
      .insert(customers)
      .values({
        fullName: result.data.fullName,
        email,
        phoneE164,
        marketCode: result.data.marketCode,
        passwordHash,
      })
      .returning({ id: customers.id });
    if (!customer) return { status: 'error', message: 'No pudimos crear tu cuenta.' };
    customerId = customer.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'error',
        message: 'Ya existe una cuenta con ese correo o WhatsApp. Intenta iniciar sesión.',
      };
    }
    throw error;
  }

  await createCustomerSession(customerId);
  redirect('/mi-cuenta');
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
    next: formData.get('next') || undefined,
  });
  if (!result.success) return { status: 'error', fieldErrors: zodFieldErrors(result.error) };

  const identifier = normalizeLoginIdentifier(result.data.identifier);
  const rateLimit = await checkAuthRateLimit(identifier, 'login');
  if (!rateLimit.allowed) {
    return {
      status: 'error',
      message: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.',
    };
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(or(eq(customers.email, identifier), eq(customers.phoneE164, identifier)))
    .limit(1);

  const validPassword = customer
    ? await verifyPassword(customer.passwordHash, result.data.password)
    : false;

  if (!customer || !validPassword || customer.status !== 'active') {
    await registerAuthFailure(rateLimit.key, 'login');
    return { status: 'error', message: 'El correo, WhatsApp o contraseña no son correctos.' };
  }

  await Promise.all([
    clearAuthFailures(rateLimit.key, 'login'),
    db.update(customers).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(customers.id, customer.id)),
  ]);
  await createCustomerSession(customer.id);
  const fallback = customer.role === 'admin' ? '/admin' : '/mi-cuenta';
  const requestedNext =
    customer.role === 'admin' && result.data.next === '/mi-cuenta'
      ? undefined
      : result.data.next;
  redirect(safeNextPath(requestedNext, fallback));
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect('/');
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = recoverySchema.safeParse({ identifier: formData.get('identifier') });
  if (!result.success) return { status: 'error', fieldErrors: zodFieldErrors(result.error) };

  const identifier = normalizeLoginIdentifier(result.data.identifier);
  const rateLimit = await checkAuthRateLimit(identifier, 'password_reset');
  if (!rateLimit.allowed) {
    return {
      status: 'success',
      message: 'Si encontramos una cuenta, te enviaremos instrucciones para recuperar el acceso.',
    };
  }

  const [customer] = await db
    .select({ id: customers.id, email: customers.email })
    .from(customers)
    .where(or(eq(customers.email, identifier), eq(customers.phoneE164, identifier)))
    .limit(1);

  if (customer) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.customerId, customer.id), isNull(passwordResetTokens.usedAt)));
    await db.insert(passwordResetTokens).values({
      customerId: customer.id,
      tokenHash: hashResetToken(token),
      expiresAt,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000';
    const resetUrl = `${baseUrl}/restablecer-contrasena?token=${token}`;
    await sendPasswordResetEmail(customer.email, resetUrl);
  }

  await registerAuthFailure(rateLimit.key, 'password_reset');
  return {
    status: 'success',
    message: 'Si encontramos una cuenta, te enviaremos instrucciones para recuperar el acceso.',
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    passwordConfirmation: formData.get('passwordConfirmation'),
  });
  if (!result.success) return { status: 'error', fieldErrors: zodFieldErrors(result.error) };

  const [record] = await db
    .select({ id: passwordResetTokens.id, customerId: passwordResetTokens.customerId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashResetToken(result.data.token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!record) {
    return {
      status: 'error',
      fieldErrors: { token: ['El enlace venció o ya fue utilizado. Solicita uno nuevo.'] },
    };
  }

  const passwordHash = await hashPassword(result.data.password);
  await db.transaction(async (tx) => {
    await tx
      .update(customers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(customers.id, record.customerId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.customerId, record.customerId), isNull(authSessions.revokedAt)));
  });

  await createCustomerSession(record.customerId);
  redirect('/mi-cuenta');
}

export async function closeAllSessionsAction() {
  const customer = await requireCustomer();
  await destroyAllCustomerSessions(customer.id);
  redirect('/ingresar');
}
