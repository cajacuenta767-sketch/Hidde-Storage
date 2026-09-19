'use client';

import { CircleCheck, KeyRound, LoaderCircle, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import {
  createServiceAccountAction,
  type InventoryActionState,
} from '@/app/actions/inventory';

const initialState: InventoryActionState = { status: 'idle' };

type ProductOption = {
  id: number;
  serviceName: string;
  planName: string;
};

export function CreateServiceAccountForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createServiceAccountAction, initialState);

  useEffect(() => {
    if (state.status !== 'success' || !state.entityId) return;
    const timeout = window.setTimeout(() => router.push(`/admin/inventario/${state.entityId}`), 700);
    return () => window.clearTimeout(timeout);
  }, [router, state.entityId, state.status]);

  return (
    <form className="inventory-create-form" action={action}>
      <section className="inventory-form-section">
        <div className="inventory-form-section__heading"><span>1</span><div><h2>Identificación</h2><p>Información operativa para reconocer la cuenta.</p></div></div>
        <div className="inventory-form-grid">
          <label className="form-field"><span>Producto</span><select name="productId" required defaultValue=""><option value="" disabled>Selecciona una plataforma</option>{products.map((product) => <option key={product.id} value={product.id}>{product.serviceName} · {product.planName}</option>)}</select></label>
          <label className="form-field"><span>Código interno</span><input name="internalCode" placeholder="DP-NF-005" minLength={3} maxLength={32} required /></label>
          <label className="form-field"><span>Plan de la cuenta</span><input name="planLabel" placeholder="Premium · 4 perfiles" required /></label>
          <label className="form-field"><span>Proveedor</span><input name="providerLabel" placeholder="Netflix" required /></label>
          <label className="form-field"><span>Región</span><input name="regionLabel" defaultValue="Perú y Bolivia" required /></label>
          <label className="form-field"><span>Cantidad de perfiles o cupos</span><input name="capacity" type="number" min={1} max={20} defaultValue={4} required /></label>
        </div>
      </section>

      <section className="inventory-form-section">
        <div className="inventory-form-section__heading"><span>2</span><div><h2>Credenciales protegidas</h2><p>Se cifran antes de guardarse y nunca se muestran por defecto.</p></div></div>
        <div className="inventory-security-note"><KeyRound /><span>Para consultarlas después será necesario confirmar la contraseña del administrador y dejar un motivo.</span></div>
        <div className="inventory-form-grid">
          <label className="form-field"><span>Correo de acceso</span><input name="email" type="email" autoComplete="off" placeholder="cuenta@proveedor.com" required /></label>
          <label className="form-field"><span>Contraseña del proveedor</span><input name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
          <label className="form-field"><span>PIN inicial de perfiles (opcional)</span><input name="defaultPin" inputMode="numeric" pattern="[0-9]{4,8}" placeholder="4 a 8 dígitos" /></label>
          <label className="form-field inventory-form-grid__wide"><span>Clave TOTP / autenticador (opcional)</span><input name="totpSecret" type="password" autoComplete="off" placeholder="Clave Base32 del proveedor" /><small>Se cifra al guardarse. El cliente únicamente verá códigos temporales.</small></label>
        </div>
      </section>

      <section className="inventory-form-section">
        <div className="inventory-form-section__heading"><span>3</span><div><h2>Renovación y costo</h2><p>Datos para alertas y control de rentabilidad.</p></div></div>
        <div className="inventory-form-grid">
          <label className="form-field"><span>Próxima renovación</span><input name="renewalDate" type="date" /></label>
          <label className="form-field"><span>Costo pagado</span><input name="costAmount" inputMode="decimal" placeholder="0.00" /></label>
          <label className="form-field"><span>Moneda</span><select name="costCurrency" defaultValue="PEN"><option value="PEN">Soles (PEN)</option><option value="BOB">Bolivianos (BOB)</option><option value="USD">Dólares (USD)</option></select></label>
          <label className="form-field inventory-form-grid__wide"><span>Notas internas</span><textarea name="notes" maxLength={500} placeholder="Restricciones, contacto del proveedor o recordatorios importantes" /></label>
        </div>
      </section>

      <div className="inventory-form-footer">
        {state.message ? <div className={`form-message form-message--${state.status === 'success' ? 'success' : 'error'}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.status === 'success' ? <CircleCheck /> : null}{state.message}</div> : <span />}
        <button className="account-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <Save />}{pending ? 'Guardando…' : 'Crear cuenta y perfiles'}</button>
      </div>
    </form>
  );
}
