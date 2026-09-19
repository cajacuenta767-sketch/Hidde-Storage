import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentCustomer } from '@/lib/auth/session';
import { notifyTelegramOrderCreated } from '@/lib/integrations/telegram';
import { CheckoutError, createPurchaseOrder } from '@/lib/orders/checkout';

const checkoutSchema = z.object({
  offerVariantIds: z.array(z.number().int().positive()).min(1).max(10),
  marketCode: z.enum(['PE', 'BO']),
});

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const requestHost =
      request.headers.get('x-forwarded-host') ??
      request.headers.get('host') ??
      request.nextUrl.host;
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Solicitud no permitida.' },
      { status: 403 },
    );
  }

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      {
        error: 'Inicia sesión para crear y consultar tu pedido.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 },
    );
  }

  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Revisa los datos del pedido.' },
      { status: 400 },
    );
  }

  try {
    const order = await createPurchaseOrder({ customer, ...parsed.data });
    after(async () => {
      await notifyTelegramOrderCreated(order.orderId).catch((error) => {
        console.error(
          'telegram_order_created_notification_failed',
          error instanceof Error ? error.message : 'Error desconocido',
        );
      });
    });
    return NextResponse.json(order, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error('checkout_create_failed', error);
    return NextResponse.json(
      { error: 'No pudimos crear el pedido. Intenta nuevamente.' },
      { status: 500 },
    );
  }
}
