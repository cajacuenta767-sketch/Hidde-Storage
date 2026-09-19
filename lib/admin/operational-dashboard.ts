import 'server-only';

import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  notExists,
  sql,
  type SQL,
} from 'drizzle-orm';

import { db } from '@/db/client';
import {
  accountIncidents,
  paymentRecords,
  products,
  profileAssignments,
  renewalRequests,
  serviceAccountCostEvents,
  subscriptions,
} from '@/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import { fromPenReporting, getOfficialRates, type ReportingCurrency } from './finance';
import { getInventoryAccounts, getInventoryDashboard } from './inventory-data';

export const dashboardPeriods = ['30d', 'month', '90d'] as const;
export const dashboardMarkets = ['all', 'PE', 'BO'] as const;

export type DashboardPeriod = (typeof dashboardPeriods)[number];
export type DashboardMarket = (typeof dashboardMarkets)[number];

export type OperationalDashboardFilters = {
  period: DashboardPeriod;
  market: DashboardMarket;
  currency: ReportingCurrency;
};

type DateRange = {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  days: number;
};

type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
type AccountHealth = 'healthy' | 'attention' | 'critical' | 'archived';

const priorityWeight: Record<AlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function isoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function resolveRange(period: DashboardPeriod): DateRange {
  const end = isoToday();
  if (period === 'month') {
    const start = `${end.slice(0, 8)}01`;
    const days = Math.round(
      (new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) /
        86_400_000,
    ) + 1;
    const previousEnd = shiftDays(start, -1);
    return {
      start,
      end,
      previousStart: shiftDays(previousEnd, -(days - 1)),
      previousEnd,
      days,
    };
  }

  const days = period === '90d' ? 90 : 30;
  const start = shiftDays(end, -(days - 1));
  const previousEnd = shiftDays(start, -1);
  return {
    start,
    end,
    previousStart: shiftDays(previousEnd, -(days - 1)),
    previousEnd,
    days,
  };
}

function paymentConditions(rangeStart: string, rangeEnd: string, market: DashboardMarket) {
  const conditions: SQL[] = [
    eq(paymentRecords.status, 'confirmed'),
    sql`timezone('America/La_Paz', ${paymentRecords.paidAt})::date between ${rangeStart}::date and ${rangeEnd}::date`,
  ];
  if (market !== 'all') conditions.push(eq(paymentRecords.marketCode, market));
  return conditions;
}

function subscriptionMarketCondition(market: DashboardMarket) {
  return market === 'all' ? undefined : eq(subscriptions.marketCode, market);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1_000) / 10;
}

function enumerateDays(start: string, end: string) {
  const values: string[] = [];
  for (let value = start; value <= end; value = shiftDays(value, 1)) values.push(value);
  return values;
}

function healthForAccount(input: {
  status: string;
  daysToRenewal: number | null;
  openIncidents: number;
  criticalIncidents: number;
  availableProfiles: number;
  profitPenMinor: number;
}): AccountHealth {
  if (input.status === 'archived') return 'archived';
  if (
    ['expired', 'suspended'].includes(input.status) ||
    input.criticalIncidents > 0
  ) return 'critical';
  if (
    ['maintenance', 'renewal_due'].includes(input.status) ||
    (input.daysToRenewal !== null && input.daysToRenewal <= 7) ||
    input.openIncidents > 0 ||
    input.availableProfiles === 0 ||
    input.profitPenMinor < 0
  ) return 'attention';
  return 'healthy';
}

export async function getOperationalDashboard(filters: OperationalDashboardFilters) {
  await requireAdmin();
  const range = resolveRange(filters.period);
  const ratesPromise = getOfficialRates();
  const inventoryPromise = getInventoryDashboard();
  const accountsPromise = getInventoryAccounts();

  const currentPaymentConditions = paymentConditions(range.start, range.end, filters.market);
  const previousPaymentConditions = paymentConditions(
    range.previousStart,
    range.previousEnd,
    filters.market,
  );
  const paymentDay = sql<string>`timezone('America/La_Paz', ${paymentRecords.paidAt})::date`;

  const [
    rates,
    inventory,
    accounts,
    currentPayments,
    previousPayments,
    currentCosts,
    previousCosts,
    paymentTrend,
    costTrend,
    revenueByAccount,
    costsByAccount,
    criticalIncidents,
    expiringSubscriptionCount,
    expiringSubscriptions,
    unassignedSubscriptionCount,
    unassignedSubscriptions,
    pendingPayments,
  ] = await Promise.all([
    ratesPromise,
    inventoryPromise,
    accountsPromise,
    db
      .select({
        sales: sql<number>`count(*)::int`,
        revenuePenMinor: sql<number>`coalesce(sum(${paymentRecords.reportingAmountMinor}), 0)::int`,
      })
      .from(paymentRecords)
      .where(and(...currentPaymentConditions)),
    db
      .select({
        sales: sql<number>`count(*)::int`,
        revenuePenMinor: sql<number>`coalesce(sum(${paymentRecords.reportingAmountMinor}), 0)::int`,
      })
      .from(paymentRecords)
      .where(and(...previousPaymentConditions)),
    db
      .select({
        costPenMinor: sql<number>`coalesce(sum(${serviceAccountCostEvents.reportingAmountMinor}), 0)::int`,
      })
      .from(serviceAccountCostEvents)
      .where(
        sql`${serviceAccountCostEvents.incurredOn} between ${range.start}::date and ${range.end}::date`,
      ),
    db
      .select({
        costPenMinor: sql<number>`coalesce(sum(${serviceAccountCostEvents.reportingAmountMinor}), 0)::int`,
      })
      .from(serviceAccountCostEvents)
      .where(
        sql`${serviceAccountCostEvents.incurredOn} between ${range.previousStart}::date and ${range.previousEnd}::date`,
      ),
    db
      .select({
        day: paymentDay,
        revenuePenMinor: sql<number>`coalesce(sum(${paymentRecords.reportingAmountMinor}), 0)::int`,
      })
      .from(paymentRecords)
      .where(and(...currentPaymentConditions))
      .groupBy(paymentDay)
      .orderBy(asc(paymentDay)),
    db
      .select({
        day: serviceAccountCostEvents.incurredOn,
        costPenMinor: sql<number>`coalesce(sum(${serviceAccountCostEvents.reportingAmountMinor}), 0)::int`,
      })
      .from(serviceAccountCostEvents)
      .where(
        sql`${serviceAccountCostEvents.incurredOn} between ${range.start}::date and ${range.end}::date`,
      )
      .groupBy(serviceAccountCostEvents.incurredOn)
      .orderBy(asc(serviceAccountCostEvents.incurredOn)),
    db
      .select({
        serviceAccountId: paymentRecords.serviceAccountId,
        revenuePenMinor: sql<number>`coalesce(sum(${paymentRecords.reportingAmountMinor}), 0)::int`,
      })
      .from(paymentRecords)
      .where(and(...currentPaymentConditions, isNotNull(paymentRecords.serviceAccountId)))
      .groupBy(paymentRecords.serviceAccountId),
    db
      .select({
        serviceAccountId: serviceAccountCostEvents.serviceAccountId,
        costPenMinor: sql<number>`coalesce(sum(${serviceAccountCostEvents.reportingAmountMinor}), 0)::int`,
      })
      .from(serviceAccountCostEvents)
      .where(
        sql`${serviceAccountCostEvents.incurredOn} between ${range.start}::date and ${range.end}::date`,
      )
      .groupBy(serviceAccountCostEvents.serviceAccountId),
    db
      .select({
        serviceAccountId: accountIncidents.serviceAccountId,
        count: sql<number>`count(*)::int`,
      })
      .from(accountIncidents)
      .where(
        and(
          inArray(accountIncidents.status, ['open', 'in_review']),
          eq(accountIncidents.priority, 'critical'),
        ),
      )
      .groupBy(accountIncidents.serviceAccountId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.status, ['active', 'expiring']),
          sql`${subscriptions.expiresAt} between ${range.end}::date and (${range.end}::date + interval '7 days')`,
          subscriptionMarketCondition(filters.market),
        ),
      ),
    db
      .select({
        id: subscriptions.id,
        serviceName: products.serviceName,
        expiresAt: subscriptions.expiresAt,
        marketCode: subscriptions.marketCode,
      })
      .from(subscriptions)
      .innerJoin(products, eq(subscriptions.productId, products.id))
      .where(
        and(
          inArray(subscriptions.status, ['active', 'expiring']),
          sql`${subscriptions.expiresAt} between ${range.end}::date and (${range.end}::date + interval '7 days')`,
          subscriptionMarketCondition(filters.market),
        ),
      )
      .orderBy(asc(subscriptions.expiresAt))
      .limit(8),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(
        and(
          inArray(subscriptions.status, ['active', 'expiring']),
          eq(subscriptions.accessTypeCode, 'PROFILE'),
          subscriptionMarketCondition(filters.market),
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
      ),
    db
      .select({
        id: subscriptions.id,
        serviceName: products.serviceName,
        expiresAt: subscriptions.expiresAt,
        marketCode: subscriptions.marketCode,
      })
      .from(subscriptions)
      .innerJoin(products, eq(subscriptions.productId, products.id))
      .where(
        and(
          inArray(subscriptions.status, ['active', 'expiring']),
          eq(subscriptions.accessTypeCode, 'PROFILE'),
          subscriptionMarketCondition(filters.market),
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
      .orderBy(asc(subscriptions.expiresAt))
      .limit(8),
    db
      .select({
        id: renewalRequests.id,
        serviceName: products.serviceName,
        status: renewalRequests.status,
        createdAt: renewalRequests.createdAt,
      })
      .from(renewalRequests)
      .innerJoin(subscriptions, eq(renewalRequests.subscriptionId, subscriptions.id))
      .innerJoin(products, eq(subscriptions.productId, products.id))
      .where(
        and(
          inArray(renewalRequests.status, ['pending_payment', 'payment_review']),
          subscriptionMarketCondition(filters.market),
        ),
      )
      .orderBy(asc(renewalRequests.createdAt))
      .limit(8),
  ]);

  const current = currentPayments[0] ?? { sales: 0, revenuePenMinor: 0 };
  const previous = previousPayments[0] ?? { sales: 0, revenuePenMinor: 0 };
  const costPenMinor = currentCosts[0]?.costPenMinor ?? 0;
  const previousCostPenMinor = previousCosts[0]?.costPenMinor ?? 0;
  const profitPenMinor = current.revenuePenMinor - costPenMinor;
  const previousProfitPenMinor = previous.revenuePenMinor - previousCostPenMinor;

  const revenueByDay = new Map(paymentTrend.map((row) => [row.day, row.revenuePenMinor]));
  const costsByDay = new Map(costTrend.map((row) => [row.day, row.costPenMinor]));
  let cumulativeRevenue = 0;
  let cumulativeCost = 0;
  const trend = enumerateDays(range.start, range.end).map((day) => {
    cumulativeRevenue += revenueByDay.get(day) ?? 0;
    cumulativeCost += costsByDay.get(day) ?? 0;
    return {
      day,
      revenueMinor: fromPenReporting(cumulativeRevenue, filters.currency, rates),
      profitMinor: fromPenReporting(cumulativeRevenue - cumulativeCost, filters.currency, rates),
    };
  });

  const accountRevenue = new Map(
    revenueByAccount
      .filter((row) => row.serviceAccountId !== null)
      .map((row) => [row.serviceAccountId!, row.revenuePenMinor]),
  );
  const accountCosts = new Map(
    costsByAccount.map((row) => [row.serviceAccountId, row.costPenMinor]),
  );
  const criticalByAccount = new Map(
    criticalIncidents.map((row) => [row.serviceAccountId, row.count]),
  );

  const profitability = accounts.map((account) => {
    const revenuePenMinor = accountRevenue.get(account.id) ?? 0;
    const accountCostPenMinor = accountCosts.get(account.id) ?? 0;
    const accountProfitPenMinor = revenuePenMinor - accountCostPenMinor;
    const marginPercent =
      revenuePenMinor > 0 ? Math.round((accountProfitPenMinor / revenuePenMinor) * 1_000) / 10 : null;
    const availableProfiles = Math.max(0, account.profileCount - account.occupiedCount);
    return {
      id: account.id,
      internalCode: account.internalCode,
      serviceName: account.serviceName,
      imagePath: account.imagePath,
      imageAlt: account.imageAlt,
      occupiedCount: account.occupiedCount,
      profileCount: account.profileCount,
      occupancyPercent: account.occupancyPercent,
      renewalDate: account.renewalDate,
      daysToRenewal: account.daysToRenewal,
      openIncidents: account.openIncidents,
      revenueMinor: fromPenReporting(revenuePenMinor, filters.currency, rates),
      costMinor: fromPenReporting(accountCostPenMinor, filters.currency, rates),
      profitMinor: fromPenReporting(accountProfitPenMinor, filters.currency, rates),
      marginPercent,
      health: healthForAccount({
        status: account.status,
        daysToRenewal: account.daysToRenewal,
        openIncidents: account.openIncidents,
        criticalIncidents: criticalByAccount.get(account.id) ?? 0,
        availableProfiles,
        profitPenMinor: accountProfitPenMinor,
      }),
    };
  });

  const alerts: Array<{
    id: string;
    priority: AlertPriority;
    code: string;
    serviceName: string;
    reason: string;
    timing: string;
    href: string;
    action: string;
  }> = [];

  for (const account of inventory.alerts) {
    const priority: AlertPriority = ['expired', 'suspended'].includes(account.status)
      ? 'critical'
      : account.status === 'maintenance' || account.openIncidents > 0
        ? 'high'
        : 'medium';
    const reasons = [
      ['expired', 'suspended'].includes(account.status) ? 'Cuenta proveedora fuera de servicio' : null,
      account.status === 'maintenance' ? 'Cuenta en mantenimiento' : null,
      account.openIncidents > 0
        ? `${account.openIncidents} incidencia${account.openIncidents === 1 ? '' : 's'} abierta${account.openIncidents === 1 ? '' : 's'}`
        : null,
      account.daysToRenewal !== null && account.daysToRenewal <= 7 ? 'Renovación próxima' : null,
    ].filter(Boolean);
    alerts.push({
      id: `account-${account.id}`,
      priority,
      code: account.internalCode,
      serviceName: account.serviceName,
      reason: reasons.join(' · ') || 'Requiere revisión',
      timing:
        account.daysToRenewal === null
          ? 'Sin fecha de renovación'
          : account.daysToRenewal < 0
            ? `Venció hace ${Math.abs(account.daysToRenewal)} día${Math.abs(account.daysToRenewal) === 1 ? '' : 's'}`
            : account.daysToRenewal === 0
              ? 'Vence hoy'
              : `En ${account.daysToRenewal} día${account.daysToRenewal === 1 ? '' : 's'}`,
      href: `/admin/inventario/${account.id}`,
      action: 'Administrar',
    });
  }

  for (const subscription of unassignedSubscriptions) {
    alerts.push({
      id: `unassigned-${subscription.id}`,
      priority: 'high',
      code: `SUS-${String(subscription.id).padStart(4, '0')}`,
      serviceName: subscription.serviceName,
      reason: 'Suscripción pagada sin perfil asignado',
      timing: `Vence ${subscription.expiresAt}`,
      href: '/admin/asignaciones',
      action: 'Asignar',
    });
  }

  const unassignedIds = new Set(unassignedSubscriptions.map((subscription) => subscription.id));
  for (const subscription of expiringSubscriptions) {
    if (unassignedIds.has(subscription.id)) continue;
    alerts.push({
      id: `expiring-${subscription.id}`,
      priority: 'medium',
      code: `SUS-${String(subscription.id).padStart(4, '0')}`,
      serviceName: subscription.serviceName,
      reason: 'Suscripción próxima a vencer',
      timing: `Vence ${subscription.expiresAt}`,
      href: '/admin/suscripciones',
      action: 'Revisar',
    });
  }

  for (const request of pendingPayments) {
    alerts.push({
      id: `payment-${request.id}`,
      priority: request.status === 'payment_review' ? 'medium' : 'low',
      code: `DP-${String(request.id).padStart(6, '0')}`,
      serviceName: request.serviceName,
      reason: request.status === 'payment_review' ? 'Comprobante por revisar' : 'Pago pendiente',
      timing: 'Pendiente de confirmación',
      href: `/admin/pedidos/${request.id}`,
      action: request.status === 'payment_review' ? 'Revisar' : 'Ver pago',
    });
  }

  alerts.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);
  const sortedProfitability = profitability.toSorted((a, b) => {
    const healthWeight: Record<AccountHealth, number> = {
      critical: 0,
      attention: 1,
      healthy: 2,
      archived: 3,
    };
    return healthWeight[a.health] - healthWeight[b.health] || b.profitMinor - a.profitMinor;
  });

  return {
    filters,
    range,
    rates,
    currency: filters.currency,
    profitScope: filters.market === 'all' ? 'actual' : 'global_cost_estimate',
    summary: {
      sales: current.sales,
      salesChangePercent: percentChange(current.sales, previous.sales),
      revenueMinor: fromPenReporting(current.revenuePenMinor, filters.currency, rates),
      revenueChangePercent: percentChange(current.revenuePenMinor, previous.revenuePenMinor),
      costMinor: fromPenReporting(costPenMinor, filters.currency, rates),
      costChangePercent: percentChange(costPenMinor, previousCostPenMinor),
      profitMinor: fromPenReporting(profitPenMinor, filters.currency, rates),
      profitChangePercent: percentChange(profitPenMinor, previousProfitPenMinor),
      marginPercent:
        current.revenuePenMinor > 0
          ? Math.round((profitPenMinor / current.revenuePenMinor) * 1_000) / 10
          : 0,
      occupancyPercent: inventory.summary.occupancyPercent,
      occupiedProfiles: inventory.summary.occupied,
      totalProfiles: inventory.summary.capacity,
      expiringSubscriptions: expiringSubscriptionCount[0]?.count ?? 0,
      unassignedSubscriptions: unassignedSubscriptionCount[0]?.count ?? 0,
      incidents: inventory.summary.incidents,
    },
    trend,
    utilization: inventory.utilization,
    alerts: alerts.slice(0, 7),
    profitability: sortedProfitability.slice(0, 6),
    controlAccounts: sortedProfitability.slice(0, 8),
  };
}
