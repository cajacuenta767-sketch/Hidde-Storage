import { NextRequest, NextResponse } from 'next/server';

import { getCurrentCustomer } from '@/lib/auth/session';
import { getCustomerTotpCode } from '@/lib/subscriptions/access';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin');
  try {
    const requestHost =
      request.headers.get('x-forwarded-host') ??
      request.headers.get('host') ??
      request.nextUrl.host;
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
  if (!Number.isSafeInteger(subscriptionId) || subscriptionId <= 0) {
    return NextResponse.json({ error: 'Suscripción no válida.' }, { status: 400 });
  }

  const generated = await getCustomerTotpCode({ customerId: customer.id, subscriptionId });
  if (!generated) {
    return NextResponse.json({ error: 'Esta cuenta no tiene códigos temporales configurados.' }, { status: 404 });
  }
  return NextResponse.json(generated, {
    headers: { 'Cache-Control': 'no-store, private, max-age=0' },
  });
}
