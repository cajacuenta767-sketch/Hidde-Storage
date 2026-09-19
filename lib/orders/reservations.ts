import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/db/client';

export function releaseExpiredProfileReservationsQuery() {
  return sql`
    with expired_reservations as (
      update profile_reservations
      set status = 'expired',
          released_at = coalesce(released_at, now()),
          updated_at = now()
      where status = 'active'
        and expires_at <= now()
      returning account_profile_id
    )
    update account_profiles profile
    set status = 'available', updated_at = now()
    where profile.id in (
      select account_profile_id from expired_reservations
    )
      and profile.status = 'reserved'
      and not exists (
        select 1
        from profile_reservations active_reservation
        where active_reservation.account_profile_id = profile.id
          and active_reservation.status = 'active'
          and active_reservation.expires_at > now()
      )
  `;
}

export async function releaseExpiredProfileReservations() {
  await db.execute(releaseExpiredProfileReservationsQuery());
}
