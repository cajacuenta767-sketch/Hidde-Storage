'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db/client';
import { adminAuditEvents, products, promotions } from '@/db/schema';
import { requireAdmin } from '@/lib/auth/session';

export type PromotionActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

function formText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function createPromotionAction(
  _previousState: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const admin = await requireAdmin();

  const kind = formData.get('kind');
  if (kind !== 'banner' && kind !== 'announcement') {
    return { status: 'error', message: 'Elige el tipo de promoción.' };
  }
  const title = formText(formData.get('title')).trim();
  if (title.length < 4 || title.length > 160) {
    return {
      status: 'error',
      message: 'El título debe tener entre 4 y 160 caracteres.',
    };
  }
  const subtitle = formText(formData.get('subtitle')).trim() || null;
  const ctaLabel = formText(formData.get('ctaLabel')).trim() || null;

  const marketRaw = formText(formData.get('marketCode'));
  const marketCode = marketRaw === 'PE' || marketRaw === 'BO' ? marketRaw : null;

  const productRaw = formText(formData.get('productId')).trim();
  let productId: number | null = null;
  if (productRaw) {
    const parsed = Number(productRaw);
    if (!Number.isSafeInteger(parsed)) {
      return { status: 'error', message: 'El producto elegido no es válido.' };
    }
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, parsed))
      .limit(1);
    if (!product) {
      return { status: 'error', message: 'El producto elegido no existe.' };
    }
    productId = product.id;
  }
  if (kind === 'banner' && productId === null) {
    return {
      status: 'error',
      message: 'Un banner necesita un producto para mostrar su arte y abrirlo.',
    };
  }

  const sortOrder = Number(formData.get('sortOrder') ?? 0);
  const startsAt = parseOptionalDate(formData.get('startsAt'));
  const endsAt = parseOptionalDate(formData.get('endsAt'));
  if (startsAt === undefined || endsAt === undefined) {
    return { status: 'error', message: 'Revisa las fechas de la promoción.' };
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    return {
      status: 'error',
      message: 'La fecha de fin debe ser posterior a la de inicio.',
    };
  }

  const [created] = await db
    .insert(promotions)
    .values({
      kind,
      title,
      subtitle,
      ctaLabel,
      productId,
      marketCode,
      sortOrder: Number.isSafeInteger(sortOrder) ? sortOrder : 0,
      startsAt,
      endsAt,
    })
    .returning({ id: promotions.id });
  if (!created) {
    return { status: 'error', message: 'No pudimos guardar la promoción.' };
  }
  await db.insert(adminAuditEvents).values({
    adminCustomerId: admin.id,
    action: 'promotion_created',
    entityType: 'promotion',
    entityId: created.id,
    summary: `Promoción ${kind === 'banner' ? 'banner' : 'anuncio'} creada: ${title}`,
  });

  revalidatePath('/admin/promociones');
  revalidatePath('/');
  return {
    status: 'success',
    message:
      kind === 'banner'
        ? 'Banner creado. Ya aparece en la portada.'
        : 'Anuncio creado. Ya rota en la barra superior.',
  };
}

export async function togglePromotionAction(formData: FormData) {
  const admin = await requireAdmin();
  const promotionId = Number(formData.get('promotionId'));
  if (!Number.isSafeInteger(promotionId)) return;

  const [current] = await db
    .select({ id: promotions.id, isActive: promotions.isActive, title: promotions.title })
    .from(promotions)
    .where(eq(promotions.id, promotionId))
    .limit(1);
  if (!current) return;

  await db
    .update(promotions)
    .set({ isActive: !current.isActive, updatedAt: new Date() })
    .where(eq(promotions.id, promotionId));
  await db.insert(adminAuditEvents).values({
    adminCustomerId: admin.id,
    action: current.isActive ? 'promotion_disabled' : 'promotion_enabled',
    entityType: 'promotion',
    entityId: promotionId,
    summary: `Promoción ${current.isActive ? 'desactivada' : 'activada'}: ${current.title}`,
  });

  revalidatePath('/admin/promociones');
  revalidatePath('/');
}

export async function deletePromotionAction(formData: FormData) {
  const admin = await requireAdmin();
  const promotionId = Number(formData.get('promotionId'));
  if (!Number.isSafeInteger(promotionId)) return;

  const [current] = await db
    .select({ id: promotions.id, title: promotions.title })
    .from(promotions)
    .where(eq(promotions.id, promotionId))
    .limit(1);
  if (!current) return;

  await db.delete(promotions).where(eq(promotions.id, promotionId));
  await db.insert(adminAuditEvents).values({
    adminCustomerId: admin.id,
    action: 'promotion_deleted',
    entityType: 'promotion',
    entityId: promotionId,
    summary: `Promoción eliminada: ${current.title}`,
  });

  revalidatePath('/admin/promociones');
  revalidatePath('/');
}
