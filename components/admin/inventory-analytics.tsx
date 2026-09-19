'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type UtilizationRow = {
  serviceName: string;
  occupied: number;
  available: number;
  total: number;
};

export function InventoryAnalytics({ data }: { data: UtilizationRow[] }) {
  if (data.length === 0) {
    return <div className="admin-chart-empty">La ocupación aparecerá al crear cuentas.</div>;
  }

  return (
    <div className="admin-inventory-chart" aria-label="Ocupación por plataforma">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={286}
        initialDimension={{ width: 620, height: 286 }}
      >
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 6 }}>
          <CartesianGrid stroke="#EAECF0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#667085', fontSize: 11 }} />
          <YAxis dataKey="serviceName" type="category" width={92} tickLine={false} axisLine={false} tick={{ fill: '#344054', fontSize: 11, fontWeight: 650 }} />
          <Tooltip
            cursor={{ fill: '#F9FAFB' }}
            contentStyle={{ border: '1px solid #E4E7EC', borderRadius: 8, boxShadow: '0 8px 20px rgb(16 24 40 / 8%)', fontSize: 12 }}
          />
          <Bar dataKey="occupied" name="Ocupados" stackId="capacity" fill="#155EEF" radius={[4, 0, 0, 4]} />
          <Bar dataKey="available" name="Disponibles" stackId="capacity" fill="#DDE8FF" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
