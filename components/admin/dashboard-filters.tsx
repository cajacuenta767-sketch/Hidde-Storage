'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Coins, Globe2 } from 'lucide-react';

import type {
  DashboardMarket,
  DashboardPeriod,
} from '@/lib/admin/operational-dashboard';
import type { ReportingCurrency } from '@/lib/admin/finance';

type DashboardFiltersProps = {
  period: DashboardPeriod;
  market: DashboardMarket;
  currency: ReportingCurrency;
};

export function DashboardFilters({ period, market, currency }: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(name: 'period' | 'market' | 'currency', value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="ops-filters" aria-label="Filtros del dashboard" aria-busy={isPending}>
      <label>
        <CalendarDays aria-hidden="true" />
        <span className="sr-only">Período</span>
        <select
          value={period}
          onChange={(event) => updateFilter('period', event.target.value)}
          disabled={isPending}
        >
          <option value="30d">Últimos 30 días</option>
          <option value="month">Mes actual</option>
          <option value="90d">Últimos 90 días</option>
        </select>
      </label>
      <label>
        <Globe2 aria-hidden="true" />
        <span className="sr-only">País</span>
        <select
          value={market}
          onChange={(event) => updateFilter('market', event.target.value)}
          disabled={isPending}
        >
          <option value="all">Todos · Perú · Bolivia</option>
          <option value="PE">Perú</option>
          <option value="BO">Bolivia</option>
        </select>
      </label>
      <label>
        <Coins aria-hidden="true" />
        <span className="sr-only">Moneda de reporte</span>
        <select
          value={currency}
          onChange={(event) => updateFilter('currency', event.target.value)}
          disabled={isPending}
        >
          <option value="PEN">PEN</option>
          <option value="BOB">BOB</option>
        </select>
      </label>
      {isPending ? <span className="ops-filters__loading">Actualizando…</span> : null}
    </div>
  );
}

