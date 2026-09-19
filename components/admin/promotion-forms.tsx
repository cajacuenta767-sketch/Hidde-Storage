'use client';

import { LoaderCircle, Megaphone, Power, Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import {
  createPromotionAction,
  deletePromotionAction,
  togglePromotionAction,
  type PromotionActionState,
} from '@/app/actions/promotions';

const initialState: PromotionActionState = { status: 'idle' };

export function CreatePromotionForm({
  products,
}: {
  products: Array<{ id: number; serviceName: string; planName: string }>;
}) {
  const [state, action, pending] = useActionState(
    createPromotionAction,
    initialState,
  );
  const [kind, setKind] = useState<'banner' | 'announcement'>('banner');
  return (
    <form className="incident-create-form" action={action}>
      <div className="inventory-form-grid">
        <label className="form-field">
          <span>Tipo</span>
          <select
            name="kind"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value === 'announcement' ? 'announcement' : 'banner')
            }
          >
            <option value="banner">Banner de oferta (carrusel)</option>
            <option value="announcement">Anuncio (barra superior)</option>
          </select>
        </label>
        <label className="form-field">
          <span>País</span>
          <select name="marketCode" defaultValue="">
            <option value="">Perú y Bolivia</option>
            <option value="PE">Solo Perú</option>
            <option value="BO">Solo Bolivia</option>
          </select>
        </label>
        <label className="form-field">
          <span>Orden</span>
          <input name="sortOrder" type="number" defaultValue={0} min={0} max={999} />
        </label>
        <label className="form-field inventory-form-grid__wide">
          <span>Título</span>
          <input
            name="title"
            minLength={4}
            maxLength={160}
            placeholder={
              kind === 'banner'
                ? 'Ej. Netflix Premium con -35%'
                : 'Ej. 🔥 Ofertas de la semana en streaming'
            }
            required
          />
        </label>
        {kind === 'banner' ? (
          <>
            <label className="form-field inventory-form-grid__wide">
              <span>Subtítulo (opcional)</span>
              <input
                name="subtitle"
                maxLength={200}
                placeholder="Ej. Perfil propio desde S/ 9.90 al mes"
              />
            </label>
            <label className="form-field">
              <span>Producto</span>
              <select name="productId" defaultValue="" required>
                <option value="" disabled>
                  Elegir producto
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.serviceName} — {product.planName}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Texto del botón</span>
              <input name="ctaLabel" maxLength={40} placeholder="Ver oferta" />
            </label>
          </>
        ) : null}
        <label className="form-field">
          <span>Inicia (opcional)</span>
          <input name="startsAt" type="datetime-local" />
        </label>
        <label className="form-field">
          <span>Termina (opcional)</span>
          <input name="endsAt" type="datetime-local" />
        </label>
      </div>
      {state.message ? (
        <div
          className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`}
          role={state.status === 'error' ? 'alert' : 'status'}
        >
          {state.message}
        </div>
      ) : null}
      <button
        className="account-button account-button--secondary"
        type="submit"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="spin" /> : <Megaphone />}
        {pending ? 'Guardando…' : 'Publicar promoción'}
      </button>
    </form>
  );
}

export function TogglePromotionForm({
  promotionId,
  isActive,
}: {
  promotionId: number;
  isActive: boolean;
}) {
  return (
    <form action={togglePromotionAction}>
      <input type="hidden" name="promotionId" value={promotionId} />
      <button className="inventory-small-button" type="submit">
        <Power />
        {isActive ? 'Pausar' : 'Activar'}
      </button>
    </form>
  );
}

export function DeletePromotionForm({ promotionId }: { promotionId: number }) {
  return (
    <details className="inventory-action-details">
      <summary>
        <Trash2 /> Eliminar
      </summary>
      <form action={deletePromotionAction}>
        <input type="hidden" name="promotionId" value={promotionId} />
        <p className="admin-form-note">
          La promoción desaparecerá de la portada de inmediato.
        </p>
        <button
          className="inventory-small-button inventory-small-button--danger"
          type="submit"
        >
          <Trash2 /> Confirmar eliminación
        </button>
      </form>
    </details>
  );
}
