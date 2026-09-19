import type {
  IncidentStatus,
  ServiceAccountStatus,
} from '@/lib/admin/inventory-data';

export const serviceAccountStatusMeta: Record<
  ServiceAccountStatus,
  { label: string; tone: 'active' | 'info' | 'warning' | 'danger' | 'muted' }
> = {
  active: { label: 'Activa', tone: 'active' },
  maintenance: { label: 'Mantenimiento', tone: 'warning' },
  suspended: { label: 'Suspendida', tone: 'danger' },
  renewal_due: { label: 'Por renovar', tone: 'warning' },
  expired: { label: 'Vencida', tone: 'danger' },
  archived: { label: 'Archivada', tone: 'muted' },
};

export const profileStatusMeta: Record<
  string,
  { label: string; tone: 'active' | 'info' | 'warning' | 'danger' | 'muted' }
> = {
  available: { label: 'Disponible', tone: 'info' },
  assigned: { label: 'Ocupado', tone: 'active' },
  reserved: { label: 'Reservado', tone: 'warning' },
  blocked: { label: 'Bloqueado', tone: 'danger' },
  maintenance: { label: 'Mantenimiento', tone: 'warning' },
};

export const incidentStatusMeta: Record<
  IncidentStatus,
  { label: string; tone: 'active' | 'info' | 'warning' | 'danger' | 'muted' }
> = {
  open: { label: 'Abierta', tone: 'danger' },
  in_review: { label: 'En revisión', tone: 'warning' },
  resolved: { label: 'Resuelta', tone: 'active' },
  closed: { label: 'Cerrada', tone: 'muted' },
};

export const incidentPriorityMeta: Record<
  string,
  { label: string; tone: 'info' | 'warning' | 'danger' | 'muted' }
> = {
  low: { label: 'Baja', tone: 'muted' },
  medium: { label: 'Media', tone: 'info' },
  high: { label: 'Alta', tone: 'warning' },
  critical: { label: 'Crítica', tone: 'danger' },
};

export function renewalLabel(days: number | null) {
  if (days === null) return 'Sin fecha';
  if (days < 0) return `Venció hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`;
  if (days === 0) return 'Renueva hoy';
  if (days === 1) return 'Renueva mañana';
  return `En ${days} días`;
}
