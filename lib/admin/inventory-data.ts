import 'server-only';

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  lte,
  ne,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accountIncidents,
  accountProfiles,
  credentialAccessEvents,
  customers,
  products,
  profileAssignments,
  serviceAccounts,
  subscriptions,
} from '@/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import { releaseExpiredProfileReservations } from '@/lib/orders/reservations';
import { decryptCredential, maskEmail } from '@/lib/security/credentials';
import { daysBetween, todayForMarket } from '@/lib/subscriptions/dates';

export const serviceAccountStatuses = [
  'active',
  'maintenance',
  'suspended',
  'renewal_due',
  'expired',
  'archived',
] as const;

export type ServiceAccountStatus = (typeof serviceAccountStatuses)[number];

export const incidentStatuses = ['open', 'in_review', 'resolved', 'closed'] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export type InventoryFilters = {
  query?: string;
  status?: ServiceAccountStatus | 'all';
};

function accountListQuery(conditions: SQL[] = []) {
  return db
    .select({
      id: serviceAccounts.id,
      internalCode: serviceAccounts.internalCode,
      serviceName: products.serviceName,
      planLabel: serviceAccounts.planLabel,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      status: serviceAccounts.status,
      capacity: serviceAccounts.capacity,
      renewalDate: serviceAccounts.renewalDate,
      costMinor: serviceAccounts.costMinor,
      costCurrency: serviceAccounts.costCurrency,
      profileCount: sql<number>`count(${accountProfiles.id})::int`,
      occupiedCount: sql<number>`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'assigned')::int`,
      reservedCount: sql<number>`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'reserved')::int`,
      availableCount: sql<number>`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'available')::int`,
      openIncidents: sql<number>`(
        select count(*)::int from ${accountIncidents}
        where ${accountIncidents.serviceAccountId} = ${serviceAccounts.id}
          and ${accountIncidents.status} in ('open', 'in_review')
      )`,
    })
    .from(serviceAccounts)
    .innerJoin(products, eq(serviceAccounts.productId, products.id))
    .leftJoin(accountProfiles, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(
      serviceAccounts.id,
      products.id,
      products.serviceName,
      products.imagePath,
      products.imageAlt,
    )
    .orderBy(asc(serviceAccounts.renewalDate), asc(serviceAccounts.internalCode));
}

export async function getInventoryAccounts({ query = '', status = 'all' }: InventoryFilters = {}) {
  await requireAdmin();
  await releaseExpiredProfileReservations();
  const conditions: SQL[] = [];
  const normalizedQuery = query.trim().slice(0, 100);

  if (status !== 'all') conditions.push(eq(serviceAccounts.status, status));
  if (normalizedQuery) {
    conditions.push(
      or(
        ilike(serviceAccounts.internalCode, `%${normalizedQuery}%`),
        ilike(products.serviceName, `%${normalizedQuery}%`),
        ilike(serviceAccounts.planLabel, `%${normalizedQuery}%`),
      )!,
    );
  }

  const rows = await accountListQuery(conditions);
  const today = todayForMarket('BO');
  return rows.map((row) => ({
    ...row,
    status: row.status as ServiceAccountStatus,
    daysToRenewal: row.renewalDate ? daysBetween(today, row.renewalDate) : null,
    occupancyPercent:
      row.profileCount > 0 ? Math.round((row.occupiedCount / row.profileCount) * 100) : 0,
  }));
}

export async function getInventoryDashboard() {
  await requireAdmin();
  await releaseExpiredProfileReservations();
  const [summaryRows, utilizationRows, alerts, accounts] = await Promise.all([
    db
      .select({
        accounts: sql<number>`count(*) filter (where ${serviceAccounts.status} <> 'archived')::int`,
        capacity: sql<number>`coalesce(sum(${serviceAccounts.capacity}) filter (where ${serviceAccounts.status} <> 'archived'), 0)::int`,
        occupied: sql<number>`(
          select count(*)::int from account_profiles inventory_profile
          inner join service_accounts inventory_account
            on inventory_account.id = inventory_profile.service_account_id
          where inventory_profile.status = 'assigned' and inventory_account.status <> 'archived'
        )`,
        reserved: sql<number>`(
          select count(*)::int from account_profiles inventory_profile
          inner join service_accounts inventory_account
            on inventory_account.id = inventory_profile.service_account_id
          where inventory_profile.status = 'reserved' and inventory_account.status <> 'archived'
        )`,
        available: sql<number>`(
          select count(*)::int from account_profiles inventory_profile
          inner join service_accounts inventory_account
            on inventory_account.id = inventory_profile.service_account_id
          where inventory_profile.status = 'available' and inventory_account.status <> 'archived'
        )`,
        incidents: sql<number>`(
          select count(*)::int from account_incidents inventory_incident
          where inventory_incident.status in ('open', 'in_review')
        )`,
        renewalsDue: sql<number>`count(*) filter (
          where ${serviceAccounts.renewalDate} between current_date and current_date + interval '7 days'
            and ${serviceAccounts.status} <> 'archived'
        )::int`,
      })
      .from(serviceAccounts),
    db
      .select({
        serviceName: products.serviceName,
        total: sql<number>`count(${accountProfiles.id})::int`,
        occupied: sql<number>`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'assigned')::int`,
        reserved: sql<number>`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'reserved')::int`,
        available: sql<number>`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'available')::int`,
      })
      .from(accountProfiles)
      .innerJoin(serviceAccounts, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
      .innerJoin(products, eq(serviceAccounts.productId, products.id))
      .where(ne(serviceAccounts.status, 'archived'))
      .groupBy(products.serviceName)
      .orderBy(desc(sql`count(${accountProfiles.id}) filter (where ${accountProfiles.status} = 'assigned')`))
      .limit(8),
    accountListQuery([
      ne(serviceAccounts.status, 'archived'),
      or(
        inArray(serviceAccounts.status, ['maintenance', 'suspended', 'renewal_due', 'expired']),
        lte(serviceAccounts.renewalDate, sql`current_date + interval '7 days'`),
        sql`exists (
          select 1 from ${accountIncidents}
          where ${accountIncidents.serviceAccountId} = ${serviceAccounts.id}
            and ${accountIncidents.status} in ('open', 'in_review')
        )`,
      )!,
    ]).limit(6),
    accountListQuery([ne(serviceAccounts.status, 'archived')]).limit(8),
  ]);

  const summary = summaryRows[0] ?? {
    accounts: 0,
    capacity: 0,
    occupied: 0,
    reserved: 0,
    available: 0,
    incidents: 0,
    renewalsDue: 0,
  };
  const today = todayForMarket('BO');

  return {
    summary: {
      ...summary,
      occupancyPercent:
        summary.capacity > 0 ? Math.round((summary.occupied / summary.capacity) * 100) : 0,
    },
    utilization: utilizationRows.map((row) => ({
      ...row,
      occupancyPercent: row.total > 0 ? Math.round((row.occupied / row.total) * 100) : 0,
    })),
    alerts: alerts.map((row) => ({
      ...row,
      status: row.status as ServiceAccountStatus,
      daysToRenewal: row.renewalDate ? daysBetween(today, row.renewalDate) : null,
    })),
    accounts: accounts.map((row) => ({
      ...row,
      status: row.status as ServiceAccountStatus,
      daysToRenewal: row.renewalDate ? daysBetween(today, row.renewalDate) : null,
      occupancyPercent:
        row.profileCount > 0 ? Math.round((row.occupiedCount / row.profileCount) * 100) : 0,
    })),
  };
}

export async function getServiceAccountDetail(accountId: number) {
  await requireAdmin();
  await releaseExpiredProfileReservations();
  const [account] = await db
    .select({
      id: serviceAccounts.id,
      internalCode: serviceAccounts.internalCode,
      productId: serviceAccounts.productId,
      serviceName: products.serviceName,
      productPlanName: products.planName,
      planLabel: serviceAccounts.planLabel,
      providerLabel: serviceAccounts.providerLabel,
      regionLabel: serviceAccounts.regionLabel,
      imagePath: products.imagePath,
      imageAlt: products.imageAlt,
      status: serviceAccounts.status,
      capacity: serviceAccounts.capacity,
      renewalDate: serviceAccounts.renewalDate,
      costMinor: serviceAccounts.costMinor,
      costCurrency: serviceAccounts.costCurrency,
      encryptedEmail: serviceAccounts.encryptedEmail,
      emailIv: serviceAccounts.emailIv,
      hasTotpSecret: sql<boolean>`${serviceAccounts.encryptedTotpSecret} is not null and ${serviceAccounts.totpSecretIv} is not null`,
      hasEmailOtp: sql<boolean>`${serviceAccounts.encryptedOtpInboxEmail} is not null and ${serviceAccounts.encryptedOtpInboxPassword} is not null`,
      emailOtpProvider: serviceAccounts.otpInboxProvider,
      notes: serviceAccounts.notes,
      updatedAt: serviceAccounts.updatedAt,
    })
    .from(serviceAccounts)
    .innerJoin(products, eq(serviceAccounts.productId, products.id))
    .where(eq(serviceAccounts.id, accountId))
    .limit(1);

  if (!account) return null;

  const [profiles, incidents, accessHistory, candidates] = await Promise.all([
    db
      .select({
        id: accountProfiles.id,
        position: accountProfiles.position,
        displayName: accountProfiles.displayName,
        status: accountProfiles.status,
        hasPin: sql<boolean>`${accountProfiles.encryptedPin} is not null`,
        notes: accountProfiles.notes,
        assignmentId: profileAssignments.id,
        subscriptionId: profileAssignments.subscriptionId,
        startsAt: profileAssignments.startsAt,
        expiresAt: profileAssignments.expiresAt,
        customerId: customers.id,
        customerName: customers.fullName,
        customerEmail: customers.email,
        customerPhone: customers.phoneE164,
        marketCode: customers.marketCode,
      })
      .from(accountProfiles)
      .leftJoin(
        profileAssignments,
        and(
          eq(profileAssignments.accountProfileId, accountProfiles.id),
          eq(profileAssignments.status, 'active'),
        ),
      )
      .leftJoin(customers, eq(profileAssignments.customerId, customers.id))
      .where(eq(accountProfiles.serviceAccountId, accountId))
      .orderBy(asc(accountProfiles.position)),
    db
      .select({
        id: accountIncidents.id,
        profileId: accountIncidents.accountProfileId,
        title: accountIncidents.title,
        description: accountIncidents.description,
        incidentType: accountIncidents.incidentType,
        priority: accountIncidents.priority,
        status: accountIncidents.status,
        resolutionNote: accountIncidents.resolutionNote,
        createdAt: accountIncidents.createdAt,
        resolvedAt: accountIncidents.resolvedAt,
      })
      .from(accountIncidents)
      .where(eq(accountIncidents.serviceAccountId, accountId))
      .orderBy(desc(accountIncidents.createdAt))
      .limit(20),
    db
      .select({
        id: credentialAccessEvents.id,
        adminName: customers.fullName,
        secretType: credentialAccessEvents.secretType,
        action: credentialAccessEvents.action,
        reason: credentialAccessEvents.reason,
        createdAt: credentialAccessEvents.createdAt,
      })
      .from(credentialAccessEvents)
      .innerJoin(customers, eq(credentialAccessEvents.adminCustomerId, customers.id))
      .where(eq(credentialAccessEvents.serviceAccountId, accountId))
      .orderBy(desc(credentialAccessEvents.createdAt))
      .limit(12),
    db
      .select({
        subscriptionId: subscriptions.id,
        customerId: customers.id,
        customerName: customers.fullName,
        customerEmail: customers.email,
        marketCode: customers.marketCode,
        serviceName: products.serviceName,
        startDate: subscriptions.startDate,
        expiresAt: subscriptions.expiresAt,
      })
      .from(subscriptions)
      .innerJoin(customers, eq(subscriptions.customerId, customers.id))
      .innerJoin(products, eq(subscriptions.productId, products.id))
      .where(
        and(
          eq(products.serviceName, account.serviceName),
          eq(subscriptions.accessTypeCode, 'PROFILE'),
          inArray(subscriptions.status, ['active', 'expiring']),
          notExists(
            db
              .select({ id: profileAssignments.id })
              .from(profileAssignments)
              .where(
                and(
                  eq(profileAssignments.subscriptionId, subscriptions.id),
                  eq(profileAssignments.status, 'active'),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(customers.fullName)),
  ]);

  const today = todayForMarket('BO');
  return {
    ...account,
    status: account.status as ServiceAccountStatus,
    maskedEmail: maskEmail(decryptCredential(account.encryptedEmail, account.emailIv)),
    maskedPassword: '••••••••••••',
    encryptedEmail: undefined,
    emailIv: undefined,
    daysToRenewal: account.renewalDate ? daysBetween(today, account.renewalDate) : null,
    profiles,
    incidents: incidents.map((incident) => ({
      ...incident,
      status: incident.status as IncidentStatus,
    })),
    accessHistory,
    candidates,
  };
}

export async function getProfileAssignments(status: 'active' | 'history' | 'all' = 'active') {
  await requireAdmin();
  const conditions: SQL[] = [];
  if (status === 'active') conditions.push(eq(profileAssignments.status, 'active'));
  if (status === 'history') conditions.push(ne(profileAssignments.status, 'active'));

  return db
    .select({
      id: profileAssignments.id,
      status: profileAssignments.status,
      accountId: serviceAccounts.id,
      internalCode: serviceAccounts.internalCode,
      serviceName: products.serviceName,
      profileName: accountProfiles.displayName,
      profilePosition: accountProfiles.position,
      customerName: customers.fullName,
      customerEmail: customers.email,
      marketCode: customers.marketCode,
      subscriptionId: subscriptions.id,
      startsAt: profileAssignments.startsAt,
      expiresAt: profileAssignments.expiresAt,
      assignedAt: profileAssignments.assignedAt,
      releasedAt: profileAssignments.releasedAt,
      releaseReason: profileAssignments.releaseReason,
    })
    .from(profileAssignments)
    .innerJoin(accountProfiles, eq(profileAssignments.accountProfileId, accountProfiles.id))
    .innerJoin(serviceAccounts, eq(accountProfiles.serviceAccountId, serviceAccounts.id))
    .innerJoin(products, eq(serviceAccounts.productId, products.id))
    .innerJoin(customers, eq(profileAssignments.customerId, customers.id))
    .innerJoin(subscriptions, eq(profileAssignments.subscriptionId, subscriptions.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(profileAssignments.assignedAt))
    .limit(250);
}

export async function getAccountIncidents(status: IncidentStatus | 'all' = 'all') {
  await requireAdmin();
  return db
    .select({
      id: accountIncidents.id,
      accountId: serviceAccounts.id,
      internalCode: serviceAccounts.internalCode,
      serviceName: products.serviceName,
      profileName: accountProfiles.displayName,
      customerName: customers.fullName,
      incidentType: accountIncidents.incidentType,
      title: accountIncidents.title,
      description: accountIncidents.description,
      priority: accountIncidents.priority,
      status: accountIncidents.status,
      resolutionNote: accountIncidents.resolutionNote,
      createdAt: accountIncidents.createdAt,
      resolvedAt: accountIncidents.resolvedAt,
    })
    .from(accountIncidents)
    .innerJoin(serviceAccounts, eq(accountIncidents.serviceAccountId, serviceAccounts.id))
    .innerJoin(products, eq(serviceAccounts.productId, products.id))
    .leftJoin(accountProfiles, eq(accountIncidents.accountProfileId, accountProfiles.id))
    .leftJoin(customers, eq(accountIncidents.customerId, customers.id))
    .where(status === 'all' ? undefined : eq(accountIncidents.status, status))
    .orderBy(desc(accountIncidents.createdAt))
    .limit(250);
}

export async function getInventoryProductOptions() {
  await requireAdmin();
  return db
    .select({
      id: products.id,
      serviceName: products.serviceName,
      planName: products.planName,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.serviceName), asc(products.planName));
}
