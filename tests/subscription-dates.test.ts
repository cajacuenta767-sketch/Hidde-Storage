import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addMonths,
  daysBetween,
  getTimeStatus,
  todayForMarket,
} from '../lib/subscriptions/dates.ts';

const boliviaMorning = new Date('2026-08-30T04:30:00.000Z');

void test('uses each market local date instead of the server date', () => {
  assert.equal(todayForMarket('BO', boliviaMorning), '2026-08-30');
  assert.equal(todayForMarket('PE', boliviaMorning), '2026-08-29');
});

void test('calculates calendar-day differences deterministically', () => {
  assert.equal(daysBetween('2026-08-30', '2026-09-06'), 7);
  assert.equal(daysBetween('2026-08-30', '2026-08-27'), -3);
});

void test('clamps renewals to the final valid day of the target month', () => {
  assert.equal(addMonths('2026-08-31', 6), '2027-02-28');
  assert.equal(addMonths('2027-08-31', 6), '2028-02-29');
});

void test('classifies the 7, 3, 1, 0 and expired warning boundaries', () => {
  const expectations = [
    ['2026-09-06', 7, 'info', '7 días restantes'],
    ['2026-09-02', 3, 'warning', '3 días restantes'],
    ['2026-08-31', 1, 'danger', '1 día restante'],
    ['2026-08-30', 0, 'danger', 'Vence hoy'],
    ['2026-08-27', -3, 'muted', 'Vencida hace 3 días'],
  ] as const;

  for (const [expiresAt, daysRemaining, tone, remainingLabel] of expectations) {
    const status = getTimeStatus(
      '2026-08-01',
      expiresAt,
      'BO',
      'active',
      boliviaMorning,
    );
    assert.equal(status.daysRemaining, daysRemaining);
    assert.equal(status.tone, tone);
    assert.equal(status.remainingLabel, remainingLabel);
  }
});

void test('persisted cancelled and pending states take precedence', () => {
  assert.equal(
    getTimeStatus(
      '2026-08-01',
      '2026-09-30',
      'BO',
      'cancelled',
      boliviaMorning,
    ).stateLabel,
    'Cancelada',
  );
  assert.equal(
    getTimeStatus(
      '2026-08-01',
      '2026-09-30',
      'BO',
      'pending',
      boliviaMorning,
    ).remainingLabel,
    'Pendiente de activación',
  );
});
