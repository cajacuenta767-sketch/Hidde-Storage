import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentCustomer } from '@/lib/auth/session';
import { redeemDeliveryToken } from '@/lib/orders/delivery';

const bodySchema = z.object({ token: z.string().trim().min(1).max(20) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const origin = request.headers.get('origin');
  const requestHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    if (origin && new URL(origin).host !== requestHost) {
      return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  }

  const customer = await getCurrentCustomer();
  if (!customer || customer.role !== 'customer') {
    return NextResponse.json({ error: 'Inicia sesión para usar el token.' }, { status: 401 });
  }
  const { publicId } = await params;
  if (!/^DP-\d{8}-[A-F0-9]{8}$/.test(publicId)) {
    return NextResponse.json({ error: 'Pedido no válido.' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Escribe el token recibido.' }, { status: 400 });
  }
  const result = await redeemDeliveryToken({
    publicId,
    customerId: customer.id,
    token: parsed.data.token,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store, private' },
  });
}
