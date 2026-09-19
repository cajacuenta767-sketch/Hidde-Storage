import 'server-only';

import { cache } from 'react';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { exchangeRates } from '@/db/schema';

export type OriginalCurrency = 'PEN' | 'BOB' | 'USD';
export type ReportingCurrency = 'PEN' | 'BOB';

export type OfficialRates = {
  usdPen: number;
  penBob: number;
  usdPenEffectiveDate: string;
  penBobEffectiveDate: string;
};

export const getOfficialRates = cache(async (): Promise<OfficialRates> => {
  const [usdPenRows, penBobRows] = await Promise.all([
    db
      .select({ rate: exchangeRates.rate, effectiveDate: exchangeRates.effectiveDate })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.baseCurrency, 'USD'),
          eq(exchangeRates.quoteCurrency, 'PEN'),
          eq(exchangeRates.isActive, true),
        ),
      )
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1),
    db
      .select({ rate: exchangeRates.rate, effectiveDate: exchangeRates.effectiveDate })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.baseCurrency, 'PEN'),
          eq(exchangeRates.quoteCurrency, 'BOB'),
          eq(exchangeRates.isActive, true),
        ),
      )
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1),
  ]);

  const usdPen = Number(usdPenRows[0]?.rate);
  const penBob = Number(penBobRows[0]?.rate);
  if (!Number.isFinite(usdPen) || usdPen <= 0 || !Number.isFinite(penBob) || penBob <= 0) {
    throw new Error('No hay tipos de cambio oficiales activos para el reporte.');
  }

  return {
    usdPen,
    penBob,
    usdPenEffectiveDate: usdPenRows[0].effectiveDate,
    penBobEffectiveDate: penBobRows[0].effectiveDate,
  };
});

export function toPenSnapshot(
  amountMinor: number,
  currency: OriginalCurrency,
  rates: OfficialRates,
) {
  const factor = currency === 'PEN' ? 1 : currency === 'USD' ? rates.usdPen : 1 / rates.penBob;
  return {
    reportingAmountMinor: Math.round(amountMinor * factor),
    exchangeRate: factor.toFixed(6),
  };
}

export function fromPenReporting(
  amountMinor: number,
  currency: ReportingCurrency,
  rates: OfficialRates,
) {
  return currency === 'PEN' ? amountMinor : Math.round(amountMinor * rates.penBob);
}

