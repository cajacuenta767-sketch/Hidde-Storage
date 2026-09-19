import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accountIncidents,
  accountProfiles,
  adminAuditEvents,
  credentialAccessEvents,
  customers,
  paymentRecords,
  products,
  profileAssignments,
  serviceAccountCostEvents,
  serviceAccounts,
  subscriptions,
} from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { requireAdmin } from '@/lib/auth/session';
import { getOfficialRates, toPenSnapshot } from '@/lib/admin/finance';
import { decryptCredential, encryptCredential } from '@/lib/security/credentials';
import { normalizeTotpSecret } from '@/lib/security/totp';
import { verifyOtpInbox } from '@/lib/integrations/email-otp';
import type { EmailOtpProvider } from '@/lib/integrations/email-otp';
import { todayForMarket } from '@/lib/subscriptions/dates';

export type InventoryMutationResult = {
  ok: boolean;
  message: string;
  entityId?: number;
};

type CreateServiceAccountInput = {
  internalCode: string;
  productId: number;
  planLabel: string;
  providerLabel: string;
  regionLabel: string;
  capacity: number;
  renewalDate: string | null;
  costMinor: number | null;
  costCurrency: 'PEN' | 'BOB' | 'USD' | null;
  email: string;
  password: string;
  defaultPin: string | null;
  totpSecret: string | null;
  notes: string;
};

export async function createServiceAccount(
  input: CreateServiceAccountInput,
): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();
  const emailSecret = encryptCredential(input.email);
  const passwordSecret = encryptCredential(input.password);
  const pinSecret = input.defaultPin ? encryptCredential(input.defaultPin) : null;
  const totpSecret = input.totpSecret
    ? encryptCredential(normalizeTotpSecret(input.totpSecret))
    : null;
  const costSnapshot =
    input.costMinor !== null && input.costCurrency !== null
      ? toPenSnapshot(input.costMinor, input.costCurrency, await getOfficialRates())
      : null;

  try {
    return await db.transaction(async (tx) => {
      const [product] = await tx
        .select({ id: products.id, serviceName: products.serviceName })
        .from(products)
        .where(and(eq(products.id, input.productId), eq(products.isActive, true)))
        .limit(1);
      if (!product) return { ok: false, message: 'El producto seleccionado no está disponible.' };

      const [existing] = await tx
        .select({ id: serviceAccounts.id })
        .from(serviceAccounts)
        .where(eq(serviceAccounts.internalCode, input.internalCode))
        .limit(1);
      if (existing) return { ok: false, message: 'Ese código interno ya está en uso.' };

      const [account] = await tx
        .insert(serviceAccounts)
        .values({
          internalCode: input.internalCode,
          productId: product.id,
          planLabel: input.planLabel,
          providerLabel: input.providerLabel,
          regionLabel: input.regionLabel,
          status: 'active',
          capacity: input.capacity,
          renewalDate: input.renewalDate,
          costMinor: input.costMinor,
          costCurrency: input.costCurrency,
          encryptedEmail: emailSecret.encryptedValue,
          emailIv: emailSecret.iv,
          encryptedPassword: passwordSecret.encryptedValue,
          passwordIv: passwordSecret.iv,
          encryptedTotpSecret: totpSecret?.encryptedValue ?? null,
          totpSecretIv: totpSecret?.iv ?? null,
          notes: input.notes,
        })
        .returning({ id: serviceAccounts.id });

      await tx.insert(accountProfiles).values(
        Array.from({ length: input.capacity }, (_, index) => ({
          serviceAccountId: account.id,
          position: index + 1,
          displayName: `Perfil ${index + 1}`,
          status: 'available',
          encryptedPin: pinSecret?.encryptedValue ?? null,
          pinIv: pinSecret?.iv ?? null,
        })),
      );

      if (costSnapshot && input.costMinor !== null && input.costCurrency !== null) {
        await tx.insert(serviceAccountCostEvents).values({
          serviceAccountId: account.id,
          costKind: 'provider_purchase',
          amountMinor: input.costMinor,
          currency: input.costCurrency,
          reportingAmountMinor: costSnapshot.reportingAmountMinor,
          reportingCurrency: 'PEN',
          exchangeRate: costSnapshot.exchangeRate,
          incurredOn: todayForMarket('BO'),
          coverageStart: todayForMarket('BO'),
          coverageEnd: input.renewalDate,
          notes: 'Costo inicial registrado al crear la cuenta proveedora.',
          createdByAdminCustomerId: admin.id,
        });
      }

      await tx.insert(adminAuditEvents).values({
        adminCustomerId: admin.id,
        action: 'service_account_created',
        entityType: 'service_account',
        entityId: account.id,
        summary: `${product.serviceName} · ${input.internalCode} fue incorporada al inventario`,
      });

      return { ok: true, message: 'Cuenta y perfiles creados correctamente.', entityId: account.id };
    });
  } catch {
    return { ok: false, message: 'No se pudo crear la cuenta. Revisa los datos e inténtalo otra vez.' };
  }
}

export async function updateServiceAccountTotp(input: {
  accountId: number;
  totpSecret: string;
}): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();
  let normalizedSecret: string;
  try {
    normalizedSecret = normalizeTotpSecret(input.totpSecret);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'La clave TOTP no es válida.',
    };
  }
  const encrypted = encryptCredential(normalizedSecret);

  const [account] = await db
    .update(serviceAccounts)
    .set({
      encryptedTotpSecret: encrypted.encryptedValue,
      totpSecretIv: encrypted.iv,
      updatedAt: new Date(),
    })
    .where(eq(serviceAccounts.id, input.accountId))
    .returning({ id: serviceAccounts.id, internalCode: serviceAccounts.internalCode });
  if (!account) return { ok: false, message: 'La cuenta ya no existe.' };

  await db.transaction(async (tx) => {
    await tx.insert(credentialAccessEvents).values({
      serviceAccountId: account.id,
      adminCustomerId: admin.id,
      secretType: 'totp_code',
      action: 'updated',
      reason: 'Configuración TOTP actualizada',
    });
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'totp_secret_updated',
      entityType: 'service_account',
      entityId: account.id,
      summary: `Clave TOTP actualizada para ${account.internalCode}`,
    });
  });

  return { ok: true, message: 'Generador de códigos configurado correctamente.', entityId: account.id };
}

export async function updateServiceAccountEmailOtp(input: {
  accountId: number;
  provider: EmailOtpProvider;
  inboxEmail: string;
  inboxPassword: string;
  inboxHost: string;
}): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();
  try {
    await verifyOtpInbox({
      provider: input.provider,
      host: input.inboxHost,
      email: input.inboxEmail,
      password: input.inboxPassword,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOTLETTERS_API_TOKEN_MISSING') {
      return {
        ok: false,
        message: 'Falta configurar NOTLETTERS_API_TOKEN en el servidor.',
      };
    }
    return {
      ok: false,
      message: input.provider === 'notletters_api'
        ? 'La API de NotLetters rechazó el acceso. Revisa el token, correo y contraseña.'
        : 'El servidor IMAP rechazó el acceso. Revisa el servidor, correo y contraseña.',
    };
  }

  const emailSecret = encryptCredential(input.inboxEmail.toLowerCase());
  const passwordSecret = encryptCredential(input.inboxPassword);
  const [account] = await db
    .update(serviceAccounts)
    .set({
      otpInboxProvider: input.provider,
      otpInboxHost: input.inboxHost,
      encryptedOtpInboxEmail: emailSecret.encryptedValue,
      otpInboxEmailIv: emailSecret.iv,
      encryptedOtpInboxPassword: passwordSecret.encryptedValue,
      otpInboxPasswordIv: passwordSecret.iv,
      encryptedEmail: emailSecret.encryptedValue,
      emailIv: emailSecret.iv,
      updatedAt: new Date(),
    })
    .where(eq(serviceAccounts.id, input.accountId))
    .returning({ id: serviceAccounts.id, internalCode: serviceAccounts.internalCode });
  if (!account) return { ok: false, message: 'La cuenta ya no existe.' };

  await db.transaction(async (tx) => {
    await tx.insert(credentialAccessEvents).values({
      serviceAccountId: account.id,
      adminCustomerId: admin.id,
      secretType: 'email_otp_code',
      action: 'updated',
      reason: `Buzón OTP configurado mediante ${input.provider === 'notletters_api' ? 'NotLetters API' : 'IMAP'}`,
    });
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'email_otp_configured',
      entityType: 'service_account',
      entityId: account.id,
      summary: `Buzón OTP verificado para ${account.internalCode} mediante ${input.provider === 'notletters_api' ? 'NotLetters API' : 'IMAP'}`,
    });
  });
  return { ok: true, message: 'Buzón verificado. Los códigos de Netflix ya están habilitados.', entityId: account.id };
}

export async function assignProfile(input: {
  profileId: number;
  subscriptionId: number;
}): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();

  try {
    return await db.transaction(async (tx) => {
      const [profile] = await tx
        .select({
          id: accountProfiles.id,
          displayName: accountProfiles.displayName,
          status: accountProfiles.status,
          accountId: serviceAccounts.id,
          internalCode: serviceAccounts.internalCode,
          serviceName: products.serviceName,
        })
        .from(accountProfiles)
        .innerJoin(serviceAccounts, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
        .innerJoin(products, eq(serviceAccounts.productId, products.id))
        .where(eq(accountProfiles.id, input.profileId))
        .limit(1);

      if (!profile) return { ok: false, message: 'El perfil ya no existe.' };
      if (profile.status !== 'available') {
        return { ok: false, message: 'El perfil ya no está disponible.' };
      }

      const [subscription] = await tx
        .select({
          id: subscriptions.id,
          customerId: subscriptions.customerId,
          customerName: customers.fullName,
          serviceName: products.serviceName,
          status: subscriptions.status,
          accessTypeCode: subscriptions.accessTypeCode,
          startDate: subscriptions.startDate,
          expiresAt: subscriptions.expiresAt,
        })
        .from(subscriptions)
        .innerJoin(customers, eq(subscriptions.customerId, customers.id))
        .innerJoin(products, eq(subscriptions.productId, products.id))
        .where(eq(subscriptions.id, input.subscriptionId))
        .limit(1);

      if (!subscription) return { ok: false, message: 'La suscripción ya no existe.' };
      if (!['active', 'expiring'].includes(subscription.status)) {
        return { ok: false, message: 'La suscripción no está activa.' };
      }
      if (subscription.accessTypeCode !== 'PROFILE') {
        return { ok: false, message: 'Esta suscripción requiere una cuenta completa, no un perfil.' };
      }
      if (subscription.serviceName !== profile.serviceName) {
        return { ok: false, message: 'El servicio de la suscripción no coincide con la cuenta.' };
      }

      const [lockedProfile] = await tx
        .update(accountProfiles)
        .set({ status: 'assigned', updatedAt: new Date() })
        .where(and(eq(accountProfiles.id, profile.id), eq(accountProfiles.status, 'available')))
        .returning({ id: accountProfiles.id });
      if (!lockedProfile) {
        return { ok: false, message: 'Otro administrador acaba de ocupar este perfil.' };
      }

      const [assignment] = await tx
        .insert(profileAssignments)
        .values({
          accountProfileId: profile.id,
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          status: 'active',
          startsAt: subscription.startDate,
          expiresAt: subscription.expiresAt,
          assignedByAdminCustomerId: admin.id,
        })
        .returning({ id: profileAssignments.id });

      await tx
        .update(paymentRecords)
        .set({ serviceAccountId: profile.accountId, updatedAt: new Date() })
        .where(
          and(
            eq(paymentRecords.subscriptionId, subscription.id),
            eq(paymentRecords.status, 'confirmed'),
            isNull(paymentRecords.serviceAccountId),
          ),
        );

      await tx.insert(adminAuditEvents).values({
        adminCustomerId: admin.id,
        action: 'profile_assigned',
        entityType: 'profile_assignment',
        entityId: assignment.id,
        summary: `${subscription.customerName} fue asignado a ${profile.internalCode} · ${profile.displayName}`,
      });

      return { ok: true, message: 'Perfil asignado correctamente.', entityId: profile.accountId };
    });
  } catch {
    return {
      ok: false,
      message: 'No se pudo asignar el perfil. Verifica que la suscripción no tenga otra asignación.',
    };
  }
}

export async function releaseProfileAssignment(input: {
  assignmentId: number;
  reason: string;
}): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();

  return db.transaction(async (tx) => {
    const [assignment] = await tx
      .select({
        id: profileAssignments.id,
        status: profileAssignments.status,
        profileId: accountProfiles.id,
        profileName: accountProfiles.displayName,
        accountId: serviceAccounts.id,
        internalCode: serviceAccounts.internalCode,
        customerName: customers.fullName,
      })
      .from(profileAssignments)
      .innerJoin(accountProfiles, eq(profileAssignments.accountProfileId, accountProfiles.id))
      .innerJoin(serviceAccounts, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
      .innerJoin(customers, eq(profileAssignments.customerId, customers.id))
      .where(eq(profileAssignments.id, input.assignmentId))
      .limit(1);

    if (!assignment) return { ok: false, message: 'La asignación ya no existe.' };
    if (assignment.status !== 'active') {
      return { ok: false, message: 'La asignación ya fue liberada.' };
    }

    const releasedAt = new Date();
    const [released] = await tx
      .update(profileAssignments)
      .set({
        status: 'released',
        releasedAt,
        releaseReason: input.reason,
        releasedByAdminCustomerId: admin.id,
        updatedAt: releasedAt,
      })
      .where(
        and(
          eq(profileAssignments.id, assignment.id),
          eq(profileAssignments.status, 'active'),
        ),
      )
      .returning({ id: profileAssignments.id });
    if (!released) return { ok: false, message: 'La asignación fue procesada desde otra sesión.' };

    await tx
      .update(accountProfiles)
      .set({ status: 'available', updatedAt: releasedAt })
      .where(eq(accountProfiles.id, assignment.profileId));

    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'profile_released',
      entityType: 'profile_assignment',
      entityId: assignment.id,
      summary: `${assignment.internalCode} · ${assignment.profileName} fue liberado de ${assignment.customerName}`,
    });

    return { ok: true, message: 'Perfil liberado y disponible nuevamente.', entityId: assignment.accountId };
  });
}

export async function openAccountIncident(input: {
  accountId: number;
  profileId: number | null;
  incidentType: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();

  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: serviceAccounts.id, internalCode: serviceAccounts.internalCode })
      .from(serviceAccounts)
      .where(eq(serviceAccounts.id, input.accountId))
      .limit(1);
    if (!account) return { ok: false, message: 'La cuenta ya no existe.' };

    if (input.profileId) {
      const [profile] = await tx
        .select({ id: accountProfiles.id })
        .from(accountProfiles)
        .where(
          and(
            eq(accountProfiles.id, input.profileId),
            eq(accountProfiles.serviceAccountId, account.id),
          ),
        )
        .limit(1);
      if (!profile) return { ok: false, message: 'El perfil no pertenece a esta cuenta.' };
    }

    const [incident] = await tx
      .insert(accountIncidents)
      .values({
        serviceAccountId: account.id,
        accountProfileId: input.profileId,
        incidentType: input.incidentType,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: 'open',
        openedByAdminCustomerId: admin.id,
      })
      .returning({ id: accountIncidents.id });

    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'incident_opened',
      entityType: 'account_incident',
      entityId: incident.id,
      summary: `Incidencia abierta en ${account.internalCode}: ${input.title}`,
    });

    return { ok: true, message: 'Incidencia registrada.', entityId: account.id };
  });
}

export async function resolveAccountIncident(input: {
  incidentId: number;
  resolutionNote: string;
}): Promise<InventoryMutationResult> {
  const admin = await requireAdmin();

  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        id: accountIncidents.id,
        status: accountIncidents.status,
        accountId: serviceAccounts.id,
        internalCode: serviceAccounts.internalCode,
        title: accountIncidents.title,
      })
      .from(accountIncidents)
      .innerJoin(serviceAccounts, eq(accountIncidents.serviceAccountId, serviceAccounts.id))
      .where(eq(accountIncidents.id, input.incidentId))
      .limit(1);

    if (!record) return { ok: false, message: 'La incidencia ya no existe.' };
    if (!['open', 'in_review'].includes(record.status)) {
      return { ok: false, message: 'La incidencia ya fue cerrada.' };
    }

    const resolvedAt = new Date();
    const [resolved] = await tx
      .update(accountIncidents)
      .set({
        status: 'resolved',
        resolutionNote: input.resolutionNote,
        resolvedByAdminCustomerId: admin.id,
        resolvedAt,
        updatedAt: resolvedAt,
      })
      .where(
        and(
          eq(accountIncidents.id, record.id),
          inArray(accountIncidents.status, ['open', 'in_review']),
        ),
      )
      .returning({ id: accountIncidents.id });
    if (!resolved) return { ok: false, message: 'La incidencia fue procesada desde otra sesión.' };

    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'incident_resolved',
      entityType: 'account_incident',
      entityId: record.id,
      summary: `Incidencia resuelta en ${record.internalCode}: ${record.title}`,
    });

    return { ok: true, message: 'Incidencia resuelta.', entityId: record.accountId };
  });
}

export type RevealSecretType = 'provider_email' | 'provider_password' | 'profile_pin';

export async function revealAccountCredential(input: {
  accountId: number;
  profileId: number | null;
  secretType: RevealSecretType;
  adminPassword: string;
  reason: string;
}): Promise<{ ok: boolean; message: string; value?: string }> {
  const admin = await requireAdmin();
  const [adminRecord] = await db
    .select({ passwordHash: customers.passwordHash })
    .from(customers)
    .where(eq(customers.id, admin.id))
    .limit(1);

  if (!adminRecord?.passwordHash || !(await verifyPassword(adminRecord.passwordHash, input.adminPassword))) {
    return { ok: false, message: 'La contraseña de administrador no es correcta.' };
  }

  let value: string;
  let profileId: number | null = null;
  if (input.secretType === 'profile_pin') {
    if (!input.profileId) return { ok: false, message: 'Selecciona un perfil válido.' };
    const [profile] = await db
      .select({
        id: accountProfiles.id,
        encryptedPin: accountProfiles.encryptedPin,
        pinIv: accountProfiles.pinIv,
      })
      .from(accountProfiles)
      .where(
        and(
          eq(accountProfiles.id, input.profileId),
          eq(accountProfiles.serviceAccountId, input.accountId),
        ),
      )
      .limit(1);
    if (!profile?.encryptedPin || !profile.pinIv) {
      return { ok: false, message: 'Este perfil no tiene un PIN registrado.' };
    }
    value = decryptCredential(profile.encryptedPin, profile.pinIv);
    profileId = profile.id;
  } else {
    const [account] = await db
      .select({
        encryptedEmail: serviceAccounts.encryptedEmail,
        emailIv: serviceAccounts.emailIv,
        encryptedPassword: serviceAccounts.encryptedPassword,
        passwordIv: serviceAccounts.passwordIv,
      })
      .from(serviceAccounts)
      .where(eq(serviceAccounts.id, input.accountId))
      .limit(1);
    if (!account) return { ok: false, message: 'La cuenta ya no existe.' };

    value =
      input.secretType === 'provider_email'
        ? decryptCredential(account.encryptedEmail, account.emailIv)
        : decryptCredential(account.encryptedPassword, account.passwordIv);
  }

  await db.transaction(async (tx) => {
    await tx.insert(credentialAccessEvents).values({
      serviceAccountId: input.accountId,
      accountProfileId: profileId,
      adminCustomerId: admin.id,
      secretType: input.secretType,
      action: 'revealed',
      reason: input.reason,
    });
    await tx.insert(adminAuditEvents).values({
      adminCustomerId: admin.id,
      action: 'credential_revealed',
      entityType: profileId ? 'account_profile' : 'service_account',
      entityId: profileId ?? input.accountId,
      summary: `Credencial protegida consultada con motivo: ${input.reason}`,
    });
  });

  return { ok: true, message: 'Credencial visible durante 30 segundos.', value };
}
