'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TrendRow = {
  day: string;
  revenueMinor: number;
  profitMinor: number;
};

function compactMoney(valueMinor: number, currency: 'PEN' | 'BOB') {
  return new Intl.NumberFormat(currency === 'PEN' ? 'es-PE' : 'es-BO', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(valueMinor / 100);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

export function OperationalFinancialChart({
  data,
  currency,
}: {
  data: TrendRow[];
  currency: 'PEN' | 'BOB';
}) {
  if (data.length === 0) {
    return <div className="admin-chart-empty">No hay movimientos en el período seleccionado.</div>;
  }

  return (
    <figure
      className="ops-financial-chart"
      aria-label="Ingresos cobrados y ganancia bruta acumulados durante el período"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={272}
        initialDimension={{ width: 660, height: 272 }}
      >
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#EAECF0" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDate}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tick={{ fill: '#667085', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => compactMoney(Number(value), currency)}
            tickLine={false}
            axisLine={false}
            width={62}
            tick={{ fill: '#667085', fontSize: 12 }}
          />
          <Tooltip
            labelFormatter={(value) => shortDate(String(value))}
            formatter={(value, name) => [
              compactMoney(Number(value), currency),
              name === 'revenueMinor' ? 'Ingresos' : 'Ganancia bruta',
            ]}
            contentStyle={{
              border: '1px solid #E4E7EC',
              borderRadius: 8,
              boxShadow: '0 10px 28px rgb(16 24 40 / 10%)',
              fontSize: 12,
            }}
          />
          <ReferenceLine y={0} stroke="#98A2B3" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="revenueMinor"
            name="Ingresos"
            stroke="#155EEF"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#155EEF' }}
          />
          <Line
            type="monotone"
            dataKey="profitMinor"
            name="Ganancia bruta"
            stroke="#067647"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#067647' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
