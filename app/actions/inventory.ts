'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  assignProfile,
  createServiceAccount,
  openAccountIncident,
  releaseProfileAssignment,
  resolveAccountIncident,
  revealAccountCredential,
  updateServiceAccountTotp,
  updateServiceAccountEmailOtp,
  type RevealSecretType,
} from '@/lib/admin/inventory-mutations';

export type InventoryActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  entityId?: number;
};

export type RevealCredentialState = InventoryActionState & {
  value?: string;
  revealedAt?: number;
};

const createAccountSchema = z.object({
  internalCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9-]+$/, 'Usa letras, números y guiones.'),
  productId: z.coerce.number().int().positive(),
  planLabel: z.string().trim().min(2).max(100),
  providerLabel: z.string().trim().min(2).max(80),
  regionLabel: z.string().trim().min(2).max(80),
  capacity: z.coerce.number().int().min(1).max(20),
  renewalDate: z.string().trim().max(10).optional(),
  costAmount: z.string().trim().max(20).optional(),
  costCurrency: z.enum(['PEN', 'BOB', 'USD']).optional(),
  email: z.email().max(255),
  password: z.string().min(6).max(255),
  defaultPin: z.string().trim().regex(/^\d{4,8}$/).optional().or(z.literal('')),
  totpSecret: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional(),
});

export async function createServiceAccountAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = createAccountSchema.safeParse({
    internalCode: formData.get('internalCode'),
    productId: formData.get('productId'),
    planLabel: formData.get('planLabel'),
    providerLabel: formData.get('providerLabel'),
    regionLabel: formData.get('regionLabel'),
    capacity: formData.get('capacity'),
    renewalDate: formData.get('renewalDate') || undefined,
    costAmount: formData.get('costAmount') || undefined,
    costCurrency: formData.get('costCurrency') || undefined,
    email: formData.get('email'),
    password: formData.get('password'),
    defaultPin: formData.get('defaultPin') || '',
    totpSecret: formData.get('totpSecret') || '',
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Revisa los campos obligatorios y sus formatos.' };
  }

  const cost = parsed.data.costAmount ? Number(parsed.data.costAmount.replace(',', '.')) : null;
  if (cost !== null && (!Number.isFinite(cost) || cost < 0 || !parsed.data.costCurrency)) {
    return { status: 'error', message: 'Ingresa un costo y una moneda válidos.' };
  }

  const result = await createServiceAccount({
    internalCode: parsed.data.internalCode,
    productId: parsed.data.productId,
    planLabel: parsed.data.planLabel,
    providerLabel: parsed.data.providerLabel,
    regionLabel: parsed.data.regionLabel,
    capacity: parsed.data.capacity,
    renewalDate: parsed.data.renewalDate || null,
    costMinor: cost === null ? null : Math.round(cost * 100),
    costCurrency: cost === null ? null : (parsed.data.costCurrency ?? null),
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    defaultPin: parsed.data.defaultPin || null,
    totpSecret: parsed.data.totpSecret || null,
    notes: parsed.data.notes ?? '',
  });

  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath('/admin');
  revalidatePath('/admin/inventario');
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const totpSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  totpSecret: z.string().trim().min(16).max(160),
});

export async function updateTotpSecretAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = totpSchema.safeParse({
    accountId: formData.get('accountId'),
    totpSecret: formData.get('totpSecret'),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Ingresa una clave TOTP Base32 válida.' };
  }
  const result = await updateServiceAccountTotp(parsed.data);
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath(`/admin/inventario/${parsed.data.accountId}`);
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const emailOtpSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  provider: z.enum(['notletters_api', 'imap']),
  inboxEmail: z.email().max(255),
  inboxPassword: z.string().min(6).max(255),
  inboxHost: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]*$/).max(255),
});

export async function updateEmailOtpAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = emailOtpSchema.safeParse({
    accountId: formData.get('accountId'),
    provider: formData.get('provider'),
    inboxEmail: formData.get('inboxEmail'),
    inboxPassword: formData.get('inboxPassword'),
    inboxHost: formData.get('inboxHost'),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Revisa los datos del buzón de códigos.' };
  }
  if (parsed.data.provider === 'imap' && !parsed.data.inboxHost) {
    return { status: 'error', message: 'Ingresa el servidor IMAP.' };
  }
  const result = await updateServiceAccountEmailOtp({
    ...parsed.data,
    inboxHost: parsed.data.provider === 'notletters_api'
      ? 'api.notletters.com'
      : parsed.data.inboxHost,
  });
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath(`/admin/inventario/${parsed.data.accountId}`);
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const assignmentSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  subscriptionId: z.coerce.number().int().positive(),
});

export async function assignProfileAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = assignmentSchema.safeParse({
    profileId: formData.get('profileId'),
    subscriptionId: formData.get('subscriptionId'),
  });
  if (!parsed.success) return { status: 'error', message: 'Selecciona un perfil y un cliente.' };

  const result = await assignProfile(parsed.data);
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath('/admin');
  revalidatePath('/admin/inventario');
  revalidatePath(`/admin/inventario/${result.entityId}`);
  revalidatePath('/admin/asignaciones');
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const releaseSchema = z.object({
  assignmentId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
});

export async function releaseProfileAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = releaseSchema.safeParse({
    assignmentId: formData.get('assignmentId'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) return { status: 'error', message: 'Escribe el motivo de la liberación.' };

  const result = await releaseProfileAssignment(parsed.data);
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath('/admin');
  revalidatePath('/admin/inventario');
  revalidatePath(`/admin/inventario/${result.entityId}`);
  revalidatePath('/admin/asignaciones');
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const incidentSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  profileId: z.coerce.number().int().positive().optional(),
  incidentType: z.string().trim().min(2).max(60),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(8).max(1000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export async function openIncidentAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = incidentSchema.safeParse({
    accountId: formData.get('accountId'),
    profileId: formData.get('profileId') || undefined,
    incidentType: formData.get('incidentType'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority'),
  });
  if (!parsed.success) return { status: 'error', message: 'Completa la incidencia con más detalle.' };

  const result = await openAccountIncident({
    ...parsed.data,
    profileId: parsed.data.profileId ?? null,
  });
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath('/admin');
  revalidatePath(`/admin/inventario/${result.entityId}`);
  revalidatePath('/admin/incidencias');
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const resolveIncidentSchema = z.object({
  incidentId: z.coerce.number().int().positive(),
  resolutionNote: z.string().trim().min(5).max(600),
});

export async function resolveIncidentAction(
  _previousState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const parsed = resolveIncidentSchema.safeParse({
    incidentId: formData.get('incidentId'),
    resolutionNote: formData.get('resolutionNote'),
  });
  if (!parsed.success) return { status: 'error', message: 'Explica cómo se resolvió la incidencia.' };

  const result = await resolveAccountIncident(parsed.data);
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath('/admin');
  revalidatePath(`/admin/inventario/${result.entityId}`);
  revalidatePath('/admin/incidencias');
  return { status: 'success', message: result.message, entityId: result.entityId };
}

const revealSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  profileId: z.coerce.number().int().positive().optional(),
  secretType: z.enum(['provider_email', 'provider_password', 'profile_pin']),
  adminPassword: z.string().min(8).max(255),
  reason: z.string().trim().min(4).max(200),
});

export async function revealCredentialAction(
  _previousState: RevealCredentialState,
  formData: FormData,
): Promise<RevealCredentialState> {
  const parsed = revealSchema.safeParse({
    accountId: formData.get('accountId'),
    profileId: formData.get('profileId') || undefined,
    secretType: formData.get('secretType') as RevealSecretType,
    adminPassword: formData.get('adminPassword'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Confirma tu contraseña e indica el motivo.' };
  }

  const result = await revealAccountCredential({
    ...parsed.data,
    profileId: parsed.data.profileId ?? null,
  });
  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath(`/admin/inventario/${parsed.data.accountId}`);
  return {
    status: 'success',
    message: result.message,
    value: result.value,
    revealedAt: Date.now(),
  };
}
