import 'server-only';

import { and, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accountProfiles,
  customerCredentialAccessEvents,
  emailOtpLookupEvents,
  profileAssignments,
  serviceAccounts,
  subscriptions,
} from '@/db/schema';
import {
  decryptCredential,
  maskEmail,
  maskSecret,
} from '@/lib/security/credentials';
import { generateTotp } from '@/lib/security/totp';
import { findLatestNetflixOtp } from '@/lib/integrations/email-otp';

export type CustomerSecretType =
  | 'provider_email'
  | 'provider_password'
  | 'profile_pin';

async function getAssignedAccess(customerId: number, subscriptionId: number) {
  const [access] = await db
    .select({
      subscriptionId: subscriptions.id,
      subscriptionStatus: subscriptions.status,
      accountId: serviceAccounts.id,
      profileId: accountProfiles.id,
      profileName: accountProfiles.displayName,
      encryptedEmail: serviceAccounts.encryptedEmail,
      emailIv: serviceAccounts.emailIv,
      encryptedPassword: serviceAccounts.encryptedPassword,
      passwordIv: serviceAccounts.passwordIv,
      encryptedTotpSecret: serviceAccounts.encryptedTotpSecret,
      totpSecretIv: serviceAccounts.totpSecretIv,
      otpInboxHost: serviceAccounts.otpInboxHost,
      otpInboxProvider: serviceAccounts.otpInboxProvider,
      encryptedOtpInboxEmail: serviceAccounts.encryptedOtpInboxEmail,
      otpInboxEmailIv: serviceAccounts.otpInboxEmailIv,
      encryptedOtpInboxPassword: serviceAccounts.encryptedOtpInboxPassword,
      otpInboxPasswordIv: serviceAccounts.otpInboxPasswordIv,
      encryptedPin: accountProfiles.encryptedPin,
      pinIv: accountProfiles.pinIv,
    })
    .from(subscriptions)
    .innerJoin(
      profileAssignments,
      and(
        eq(profileAssignments.subscriptionId, subscriptions.id),
        eq(profileAssignments.status, 'active'),
      ),
    )
    .innerJoin(
      accountProfiles,
      eq(accountProfiles.id, profileAssignments.accountProfileId),
    )
    .innerJoin(
      serviceAccounts,
      eq(serviceAccounts.id, accountProfiles.serviceAccountId),
    )
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.customerId, customerId),
      ),
    )
    .limit(1);
  return access ?? null;
}

export async function getCustomerAccessSummary(
  customerId: number,
  subscriptionId: number,
) {
  const access = await getAssignedAccess(customerId, subscriptionId);
  if (!access) return null;
  const email = decryptCredential(access.encryptedEmail, access.emailIv);
  return {
    profileName: access.profileName,
    maskedEmail: maskEmail(email),
    maskedPassword: maskSecret('••••••••'),
    hasPin: Boolean(access.encryptedPin && access.pinIv),
    hasTotp: Boolean(access.encryptedTotpSecret && access.totpSecretIv),
    hasEmailOtp: Boolean(
      access.otpInboxHost &&
      access.otpInboxProvider &&
      access.encryptedOtpInboxEmail &&
      access.otpInboxEmailIv &&
      access.encryptedOtpInboxPassword &&
      access.otpInboxPasswordIv,
    ),
  };
}

export async function getCustomerEmailOtp(input: {
  customerId: number;
  subscriptionId: number;
  requestedAfter: Date;
}) {
  const rateWindow = new Date(Date.now() - 5 * 60_000);
  const [rate] = await db
    .select({ attempts: sql<number>`count(*)::int` })
    .from(emailOtpLookupEvents)
    .where(
      and(
        eq(emailOtpLookupEvents.customerId, input.customerId),
        eq(emailOtpLookupEvents.subscriptionId, input.subscriptionId),
        gte(emailOtpLookupEvents.createdAt, rateWindow),
      ),
    );
  if ((rate?.attempts ?? 0) >= 30) return { status: 'rate_limited' as const };

  const access = await getAssignedAccess(input.customerId, input.subscriptionId);
  if (
    !access ||
    !['active', 'expiring'].includes(access.subscriptionStatus) ||
    !access.otpInboxHost ||
    !access.otpInboxProvider ||
    !access.encryptedOtpInboxEmail ||
    !access.otpInboxEmailIv ||
    !access.encryptedOtpInboxPassword ||
    !access.otpInboxPasswordIv
  ) {
    return { status: 'unavailable' as const };
  }

  let lookupStatus: 'found' | 'not_found' | 'error' = 'not_found';
  try {
    const result = await findLatestNetflixOtp(
      {
        provider: access.otpInboxProvider === 'notletters_api' ? 'notletters_api' : 'imap',
        host: access.otpInboxHost,
        email: decryptCredential(access.encryptedOtpInboxEmail, access.otpInboxEmailIv),
        password: decryptCredential(access.encryptedOtpInboxPassword, access.otpInboxPasswordIv),
      },
      input.requestedAfter,
    );
    lookupStatus = result ? 'found' : 'not_found';
    await db.insert(emailOtpLookupEvents).values({
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      status: lookupStatus,
    });
    if (!result) return { status: 'waiting' as const };
    await db.insert(customerCredentialAccessEvents).values({
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      secretType: 'email_otp_code',
    });
    return { status: 'found' as const, ...result };
  } catch {
    lookupStatus = 'error';
    await db.insert(emailOtpLookupEvents).values({
      customerId: input.customerId,
      subscriptionId: input.subscriptionId,
      status: lookupStatus,
    });
    return { status: 'error' as const };
  }
}

export async function getCustomerTotpCode(input: {
  customerId: number;
  subscriptionId: number;
}) {
  const access = await getAssignedAccess(input.customerId, input.subscriptionId);
  if (
    !access ||
    !['active', 'expiring'].includes(access.subscriptionStatus) ||
    !access.encryptedTotpSecret ||
    !access.totpSecretIv
  ) {
    return null;
  }

  const secret = decryptCredential(access.encryptedTotpSecret, access.totpSecretIv);
  const generated = generateTotp(secret);
  await db.insert(customerCredentialAccessEvents).values({
    customerId: input.customerId,
    subscriptionId: input.subscriptionId,
    secretType: 'totp_code',
  });
  return generated;
}

export async function revealCustomerSubscriptionSecret(input: {
  customerId: number;
  subscriptionId: number;
  secretType: CustomerSecretType;
}) {
  const access = await getAssignedAccess(
    input.customerId,
    input.subscriptionId,
  );
  if (!access || !['active', 'expiring'].includes(access.subscriptionStatus))
    return null;

  let value: string;
  if (input.secretType === 'provider_email') {
    value = decryptCredential(access.encryptedEmail, access.emailIv);
  } else if (input.secretType === 'provider_password') {
    value = decryptCredential(access.encryptedPassword, access.passwordIv);
  } else {
    if (!access.encryptedPin || !access.pinIv) return null;
    value = decryptCredential(access.encryptedPin, access.pinIv);
  }

  await db.insert(customerCredentialAccessEvents).values({
    customerId: input.customerId,
    subscriptionId: input.subscriptionId,
    secretType: input.secretType,
  });
  return value;
}
