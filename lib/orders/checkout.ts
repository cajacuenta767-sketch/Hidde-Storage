import 'server-only';

import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  offerVariants,
  paymentAttempts,
  paymentMethods,
  products,
  purchaseOrderItems,
  purchaseOrders,
} from '@/db/schema';
import type { CurrentCustomer } from '@/lib/auth/session';
import type { MarketCode } from '@/lib/catalog-types';

const WHATSAPP_ORDER_EXPIRATION_HOURS = 24;

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

function createPublicOrderId() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('-', '');
  return `DP-${date}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function releaseOrderReservations(
  orderId: number,
  status: 'released' | 'expired',
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      with released as (
        update profile_reservations
        set status = ${status},
            released_at = now(),
            updated_at = now()
        where order_item_id in (
          select id from purchase_order_items where order_id = ${orderId}
        )
          and status = 'active'
        returning account_profile_id
      )
      update account_profiles
      set status = 'available', updated_at = now()
      where id in (select account_profile_id from released)
        and status = 'reserved'
    `);
  });
}

export type CheckoutResult = {
  orderId: string;
  mode: 'whatsapp';
  status: string;
  amountMinor: number;
  currency: 'PEN' | 'BOB';
  expiresAt: string;
};

export async function createPurchaseOrder(input: {
  customer: CurrentCustomer;
  offerVariantIds: number[];
  marketCode: MarketCode;
}): Promise<CheckoutResult> {
  const uniqueOfferIds = Array.from(new Set(input.offerVariantIds));
  if (uniqueOfferIds.length === 0 || uniqueOfferIds.length > 10) {
    throw new CheckoutError(
      'El pedido debe contener entre 1 y 10 productos.',
      'INVALID_CART',
    );
  }
  if (uniqueOfferIds.length !== input.offerVariantIds.length) {
    throw new CheckoutError(
      'El carrito contiene productos repetidos.',
      'DUPLICATE_ITEMS',
    );
  }

  const [method] = await db
    .select({ code: paymentMethods.code })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.code, 'WHATSAPP'),
        eq(paymentMethods.marketCode, input.marketCode),
        eq(paymentMethods.isActive, true),
      ),
    )
    .limit(1);
  if (!method) {
    throw new CheckoutError(
      'La compra por WhatsApp no está disponible temporalmente.',
      'WHATSAPP_UNAVAILABLE',
      503,
    );
  }

  const offerRows = await db
    .select({
      id: offerVariants.id,
      productId: offerVariants.productId,
      amountMinor: offerVariants.amountMinor,
      accessTypeCode: offerVariants.accessTypeCode,
      durationMonths: offerVariants.durationMonths,
      warrantyDays: offerVariants.warrantyDays,
      stock: offerVariants.stock,
      serviceName: products.serviceName,
      planName: products.planName,
    })
    .from(offerVariants)
    .innerJoin(products, eq(offerVariants.productId, products.id))
    .where(
      and(
        inArray(offerVariants.id, uniqueOfferIds),
        eq(offerVariants.marketCode, input.marketCode),
        eq(offerVariants.isActive, true),
        eq(products.isActive, true),
      ),
    );

  if (offerRows.length !== uniqueOfferIds.length) {
    throw new CheckoutError(
      'Uno de los productos ya no está disponible.',
      'OFFER_UNAVAILABLE',
      409,
    );
  }
  if (
    offerRows.some((offer) => offer.amountMinor === null || offer.stock <= 0)
  ) {
    throw new CheckoutError(
      'Uno de los productos no tiene precio o stock disponible.',
      'OUT_OF_STOCK',
      409,
    );
  }

  const totalAmountMinor = offerRows.reduce(
    (total, offer) => total + (offer.amountMinor ?? 0),
    0,
  );
  const expiresAt = new Date(
    Date.now() + WHATSAPP_ORDER_EXPIRATION_HOURS * 3_600_000,
  );
  const currency = input.marketCode === 'PE' ? 'PEN' : 'BOB';
  const publicId = createPublicOrderId();

  await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        publicId,
        customerId: input.customer.id,
        marketCode: input.marketCode,
        currency,
        totalAmountMinor,
        paymentMethodCode: method.code,
        expiresAt,
      })
      .returning({ id: purchaseOrders.id });

    await tx.insert(purchaseOrderItems).values(
      offerRows.map((offer) => ({
        orderId: order.id,
        productId: offer.productId,
        offerVariantId: offer.id,
        serviceName: offer.serviceName,
        planName: offer.planName,
        accessTypeCode: offer.accessTypeCode,
        durationMonths: offer.durationMonths,
        amountMinor: offer.amountMinor as number,
        warrantyDays: offer.warrantyDays,
        status: 'pending',
      })),
    );

    await tx.insert(paymentAttempts).values({
      orderId: order.id,
      provider: 'manual',
      status: 'pending',
      amountMinor: totalAmountMinor,
      currency,
      expiresAt,
    });
  });

  return {
    orderId: publicId,
    mode: 'whatsapp',
    status: 'pending_payment',
    amountMinor: totalAmountMinor,
    currency,
    expiresAt: expiresAt.toISOString(),
  };
}
