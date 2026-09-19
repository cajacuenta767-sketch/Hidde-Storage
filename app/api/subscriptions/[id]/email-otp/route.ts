import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentCustomer } from '@/lib/auth/session';
import { getCustomerEmailOtp } from '@/lib/subscriptions/access';

const bodySchema = z.object({ requestedAt: z.coerce.number().int().positive() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin');
  try {
    const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
    if (origin && new URL(origin).host !== requestHost) {
      return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  }

  const customer = await getCurrentCustomer();
  if (!customer || customer.role !== 'customer') {
    return NextResponse.json({ error: 'Inicia sesión para obtener el código.' }, { status: 401 });
  }
  const subscriptionId = Number((await params).id);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!Number.isSafeInteger(subscriptionId) || subscriptionId <= 0 || !parsed.success) {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  }
  const earliest = Date.now() - 5 * 60_000;
  const requestedAt = new Date(Math.max(earliest, Math.min(Date.now(), parsed.data.requestedAt)));
  const result = await getCustomerEmailOtp({ customerId: customer.id, subscriptionId, requestedAfter: requestedAt });
  if (result.status === 'unavailable') return NextResponse.json({ error: 'El buzón todavía no está configurado.' }, { status: 404 });
  if (result.status === 'rate_limited') return NextResponse.json({ error: 'Espera unos minutos antes de volver a buscar.' }, { status: 429 });
  if (result.status === 'error') return NextResponse.json({ error: 'No pudimos consultar el buzón. Inténtalo nuevamente.' }, { status: 502 });
  if (result.status === 'waiting') return NextResponse.json({ status: 'waiting' }, { status: 202, headers: { 'Cache-Control': 'no-store, private' } });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, private, max-age=0' } });
}
