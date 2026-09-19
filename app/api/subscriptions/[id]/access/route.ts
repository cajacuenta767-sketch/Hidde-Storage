import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentCustomer } from '@/lib/auth/session';
import { revealCustomerSubscriptionSecret } from '@/lib/subscriptions/access';

const bodySchema = z.object({
  secretType: z.enum(['provider_email', 'provider_password', 'profile_pin']),
});

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
      return NextResponse.json(
        { error: 'Solicitud no permitida.' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Solicitud no permitida.' },
      { status: 403 },
    );
  }

  const customer = await getCurrentCustomer();
  if (!customer || customer.role !== 'customer') {
    return NextResponse.json(
      { error: 'Inicia sesión para ver el acceso.' },
      { status: 401 },
    );
  }
  const { id } = await params;
  const subscriptionId = Number(id);
  if (!Number.isSafeInteger(subscriptionId) || subscriptionId <= 0) {
    return NextResponse.json(
      { error: 'Suscripción no válida.' },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Credencial no válida.' },
      { status: 400 },
    );
  }

  const value = await revealCustomerSubscriptionSecret({
    customerId: customer.id,
    subscriptionId,
    secretType: parsed.data.secretType,
  });
  if (!value) {
    return NextResponse.json(
      {
        error:
          'El acceso todavía no está asignado o la suscripción no está activa.',
      },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { value, hideAfterSeconds: 30 },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
}
