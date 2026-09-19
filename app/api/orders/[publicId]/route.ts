import { NextResponse } from 'next/server';

import { getCurrentCustomer } from '@/lib/auth/session';
import { getCustomerOrder } from '@/lib/orders/status';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { error: 'Inicia sesión para consultar el pedido.' },
      { status: 401 },
    );
  }

  const { publicId } = await params;
  if (!/^DP-\d{8}-[A-F0-9]{8}$/.test(publicId)) {
    return NextResponse.json({ error: 'Pedido no válido.' }, { status: 400 });
  }

  const order = await getCustomerOrder(customer.id, publicId);
  if (!order)
    return NextResponse.json(
      { error: 'Pedido no encontrado.' },
      { status: 404 },
    );
  return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } });
}
