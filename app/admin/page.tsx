import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  CircleGauge,
  Clock3,
  CreditCard,
  Plus,
  ReceiptText,
  ShieldAlert,
  TrendingUp,
  UserRoundPlus,
} from 'lucide-react';

import { DashboardFilters } from '@/components/admin/dashboard-filters';
import { OperationalFinancialChart } from '@/components/admin/operational-financial-chart';
import { RenewalTable } from '@/components/admin/renewal-table';
import { getAdminDashboard } from '@/lib/admin/data';
import type { ReportingCurrency } from '@/lib/admin/finance';
import {
  dashboardMarkets,
  dashboardPeriods,
  getOperationalDashboard,
  type DashboardMarket,
  type DashboardPeriod,
} from '@/lib/admin/operational-dashboard';
import { formatAdminDate, formatAdminMoney } from '@/lib/admin/presentation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const healthMeta = {
  healthy: { label: 'Saludable', tone: 'active' },
  attention: { label: 'Atención', tone: 'warning' },
  critical: { label: 'Crítica', tone: 'danger' },
  archived: { label: 'Archivada', tone: 'muted' },
} as const;

const priorityMeta = {
  critical: { label: 'Crítica', icon: ShieldAlert },
  high: { label: 'Alta', icon: AlertTriangle },
  medium: { label: 'Media', icon: Clock3 },
  low: { label: 'Baja', icon: CircleDollarSign },
} as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function changeLabel(value: number | null, positiveIsGood = true) {
  if (value === null) return <span className="ops-metric__neutral">Sin período anterior</span>;
  const isGood = positiveIsGood ? value >= 0 : value <= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={isGood ? 'ops-metric__positive' : 'ops-metric__negative'}>
      <Icon aria-hidden="true" /> {Math.abs(value).toLocaleString('es', { maximumFractionDigits: 1 })}% vs. período anterior
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'warning' | 'danger';
}) {
  return (
    <article className={`ops-metric ops-metric--${tone}`}>
      <span className="ops-metric__icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <div>{detail}</div>
      </div>
    </article>
  );
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedPeriod = firstParam(params.period);
  const requestedMarket = firstParam(params.market);
  const requestedCurrency = firstParam(params.currency);
  const period: DashboardPeriod = dashboardPeriods.includes(requestedPeriod as DashboardPeriod)
    ? (requestedPeriod as DashboardPeriod)
    : '30d';
  const market: DashboardMarket = dashboardMarkets.includes(requestedMarket as DashboardMarket)
    ? (requestedMarket as DashboardMarket)
    : 'all';
  const currency: ReportingCurrency = requestedCurrency === 'BOB' ? 'BOB' : 'PEN';

  const [dashboard, operations] = await Promise.all([
    getAdminDashboard(),
    getOperationalDashboard({ period, market, currency }),
  ]);
  const lastTrend = operations.trend.at(-1) ?? { revenueMinor: 0, profitMinor: 0 };

  return (
    <div className="account-page admin-page inventory-page ops-page">
      <header className="ops-header">
        <div>
          <h1>Control operativo</h1>
          <p className="sr-only">Resumen financiero, inventario y alertas operativas de DoraPass.</p>
        </div>
        <div className="ops-header__actions">
          <DashboardFilters period={period} market={market} currency={currency} />
          <Link className="account-button" href="/admin/inventario/nueva">
            <Plus aria-hidden="true" /> Nueva cuenta
          </Link>
        </div>
      </header>

      {operations.profitScope === 'global_cost_estimate' ? (
        <div className="ops-scope-note">
          <AlertTriangle aria-hidden="true" /> Los ingresos están filtrados por país; los costos de cuentas compartidas son globales, por lo que la ganancia es una estimación operativa.
        </div>
      ) : null}

      <section className="ops-metrics" aria-label="Indicadores principales">
        <MetricCard
          label="Ventas confirmadas"
          value={operations.summary.sales.toLocaleString('es')}
          detail={changeLabel(operations.summary.salesChangePercent)}
          icon={<ReceiptText aria-hidden="true" />}
        />
        <MetricCard
          label="Ingresos cobrados"
          value={formatAdminMoney(operations.summary.revenueMinor, currency)}
          detail={changeLabel(operations.summary.revenueChangePercent)}
          icon={<Banknote aria-hidden="true" />}
        />
        <MetricCard
          label={operations.profitScope === 'actual' ? 'Ganancia bruta' : 'Ganancia estimada'}
          value={formatAdminMoney(operations.summary.profitMinor, currency)}
          detail={
            <span className={operations.summary.marginPercent >= 0 ? 'ops-metric__positive' : 'ops-metric__negative'}>
              Margen {operations.summary.marginPercent.toLocaleString('es', { maximumFractionDigits: 1 })}% · costo {formatAdminMoney(operations.summary.costMinor, currency)}
            </span>
          }
          icon={<TrendingUp aria-hidden="true" />}
          tone={operations.summary.profitMinor < 0 ? 'danger' : 'brand'}
        />
        <MetricCard
          label="Ocupación"
          value={`${operations.summary.occupancyPercent}%`}
          detail={<span className="ops-metric__neutral">{operations.summary.occupiedProfiles} de {operations.summary.totalProfiles} perfiles</span>}
          icon={<CircleGauge aria-hidden="true" />}
        />
        <MetricCard
          label="Vencen en 7 días"
          value={operations.summary.expiringSubscriptions.toLocaleString('es')}
          detail={<span className="ops-metric__neutral">suscripciones activas</span>}
          icon={<Clock3 aria-hidden="true" />}
          tone={operations.summary.expiringSubscriptions > 0 ? 'warning' : 'brand'}
        />
        <MetricCard
          label="Incidencias abiertas"
          value={operations.summary.incidents.toLocaleString('es')}
          detail={<span className="ops-metric__neutral">{operations.summary.unassignedSubscriptions} pagadas sin perfil</span>}
          icon={<AlertTriangle aria-hidden="true" />}
          tone={operations.summary.incidents > 0 ? 'danger' : 'brand'}
        />
      </section>

      <div className="ops-primary-grid">
        <section className="ops-panel ops-chart-panel">
          <div className="ops-panel__heading">
            <div>
              <h2>Ingresos y ganancia acumulados</h2>
              <p>{formatAdminDate(operations.range.start)} – {formatAdminDate(operations.range.end)}</p>
            </div>
            <div className="ops-chart-values" aria-label="Valores actuales del gráfico">
              <span><i className="ops-dot ops-dot--blue" /> Ingresos <strong>{formatAdminMoney(lastTrend.revenueMinor, currency)}</strong></span>
              <span><i className="ops-dot ops-dot--green" /> Ganancia <strong>{formatAdminMoney(lastTrend.profitMinor, currency)}</strong></span>
            </div>
          </div>
          <OperationalFinancialChart data={operations.trend} currency={currency} />
        </section>

        <section className="ops-panel ops-attention-panel">
          <div className="ops-panel__heading">
            <div><h2>Requiere atención</h2><p>Ordenado por urgencia operativa.</p></div>
            <Link href="/admin/incidencias">Ver incidencias</Link>
          </div>
          {operations.alerts.length > 0 ? (
            <div className="ops-alert-list">
              {operations.alerts.map((alert) => {
                const meta = priorityMeta[alert.priority];
                const Icon = meta.icon;
                return (
                  <article className={`ops-alert ops-alert--${alert.priority}`} key={alert.id}>
                    <span className="ops-alert__severity" aria-label={`Prioridad ${meta.label}`}><Icon aria-hidden="true" /></span>
                    <div className="ops-alert__identity"><strong>{alert.code}</strong><small>{alert.serviceName}</small></div>
                    <div className="ops-alert__reason"><strong>{alert.reason}</strong><small>{alert.timing}</small></div>
                    <Link href={alert.href}>{alert.action}</Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-activity-empty"><CircleGauge /><span>No hay alertas operativas pendientes.</span></div>
          )}
        </section>
      </div>

      <div className="ops-secondary-grid">
        <section className="ops-panel">
          <div className="ops-panel__heading"><div><h2>Ocupación por plataforma</h2><p>Perfiles ocupados frente a capacidad disponible.</p></div><Link href="/admin/inventario">Ver detalle</Link></div>
          <div className="ops-utilization-list">
            {operations.utilization.map((row) => (
              <article key={row.serviceName}>
                <strong>{row.serviceName}</strong>
                <span className="ops-utilization-bar"><i style={{ width: `${row.occupancyPercent}%` }} /></span>
                <span>{row.occupied} / {row.total}</span>
                <b>{row.occupancyPercent}%</b>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-panel ops-profitability-panel">
          <div className="ops-panel__heading"><div><h2>Rentabilidad por cuenta</h2><p>Ingresos y costos registrados en el período.</p></div><Link href="/admin/inventario">Ver todas</Link></div>
          <div className="ops-profit-list">
            {operations.profitability.map((row, index) => {
              const health = healthMeta[row.health];
              return (
                <article key={row.id}>
                  <span className="ops-rank">{index + 1}</span>
                  <div className="ops-profit-list__identity"><strong>{row.internalCode}</strong><small>{row.serviceName}</small></div>
                  <div><small>Ingresos</small><strong>{formatAdminMoney(row.revenueMinor, currency)}</strong></div>
                  <div><small>Costo</small><strong>{formatAdminMoney(row.costMinor, currency)}</strong></div>
                  <div><small>Ganancia</small><strong className={row.profitMinor < 0 ? 'ops-negative-money' : ''}>{formatAdminMoney(row.profitMinor, currency)}</strong></div>
                  <div><small>Margen</small><strong>{row.marginPercent === null ? 'Sin ingresos' : `${row.marginPercent}%`}</strong></div>
                  <span className={`status-badge status-badge--${health.tone}`}><i /> {health.label}</span>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <nav className="ops-quick-actions" aria-label="Acciones rápidas">
        <strong>Acciones rápidas</strong>
        <Link href="/admin/asignaciones"><UserRoundPlus /> Asignar perfil</Link>
        <Link href="/admin/pedidos"><CreditCard /> Registrar pago</Link>
        <Link href="/admin/incidencias"><AlertTriangle /> Abrir incidencia</Link>
        <Link href="/admin/inventario/nueva"><Plus /> Añadir cuenta</Link>
      </nav>

      <section className="ops-panel ops-control-panel">
        <div className="ops-panel__heading"><div><h2>Cuentas que requieren control</h2><p>Salud, ocupación y resultado por cuenta proveedora.</p></div><Link href="/admin/inventario">Administrar inventario <ArrowRight /></Link></div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead><tr><th>Cuenta</th><th>Perfiles</th><th>Renovación</th><th>Ingresos</th><th>Costo</th><th>Ganancia / margen</th><th>Salud</th><th><span className="sr-only">Acción</span></th></tr></thead>
            <tbody>{operations.controlAccounts.map((row) => {
              const health = healthMeta[row.health];
              return (
                <tr key={row.id}>
                  <td data-label="Cuenta" aria-label={`Cuenta ${row.internalCode}, ${row.serviceName}`}><div className="ops-account"><span><Image src={row.imagePath} alt="" aria-hidden="true" fill sizes="42px" /></span><div><strong>{row.internalCode}</strong><small>{row.serviceName}</small></div></div></td>
                  <td data-label="Perfiles"><strong>{row.occupiedCount} / {row.profileCount}</strong><small>{row.occupancyPercent}% ocupado</small></td>
                  <td data-label="Renovación"><strong>{formatAdminDate(row.renewalDate)}</strong><small>{row.daysToRenewal === null ? 'Sin fecha' : row.daysToRenewal < 0 ? `Venció hace ${Math.abs(row.daysToRenewal)} días` : row.daysToRenewal === 0 ? 'Vence hoy' : `En ${row.daysToRenewal} días`}</small></td>
                  <td data-label="Ingresos" className="ops-number">{formatAdminMoney(row.revenueMinor, currency)}</td>
                  <td data-label="Costo" className="ops-number">{formatAdminMoney(row.costMinor, currency)}</td>
                  <td data-label="Ganancia / margen" className={`ops-number ${row.profitMinor < 0 ? 'ops-negative-money' : ''}`}><strong>{formatAdminMoney(row.profitMinor, currency)}</strong><small>{row.marginPercent === null ? 'Sin ingresos' : `${row.marginPercent}%`}</small></td>
                  <td data-label="Salud"><span className={`status-badge status-badge--${health.tone}`}><i /> {health.label}</span></td>
                  <td data-label="Acción"><Link className="inventory-detail-link" href={`/admin/inventario/${row.id}`}>Administrar</Link></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="account-section admin-section ops-support-section">
        <div className="account-section-heading"><div><h2>Pagos por revisar</h2><p>Confirma únicamente pagos que ya verificaste.</p></div><Link href="/admin/pedidos">Ver pedidos <ArrowRight /></Link></div>
        <RenewalTable rows={dashboard.orders} compact />
      </section>

      <section className="account-section admin-section ops-support-section">
        <div className="account-section-heading"><div><h2>Actividad reciente</h2><p>Acciones registradas en la auditoría administrativa.</p></div></div>
        {dashboard.activity.length > 0 ? <div className="admin-activity-list">{dashboard.activity.map((item) => <article key={item.id}><span><Activity /></span><div><strong>{item.summary}</strong><small>Realizado por {item.adminName}</small></div><time>{formatAdminDate(item.createdAt, true)}</time></article>)}</div> : <div className="admin-activity-empty"><Activity /><span>La actividad aparecerá al realizar la primera operación.</span></div>}
      </section>
    </div>
  );
}
