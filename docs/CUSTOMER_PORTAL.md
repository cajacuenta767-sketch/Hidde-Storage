# Portal de clientes DoraPass

## Desarrollo local

1. Iniciar PostgreSQL con `docker compose up -d postgres`.
2. Aplicar las migraciones con `npm run db:migrate`.
3. Cargar el catálogo y los clientes de demostración con `npm run db:seed`.
4. Iniciar DoraPass con `npm run dev`.

## Cuentas de demostración

| Mercado | Usuario | Contraseña |
| --- | --- | --- |
| Bolivia | `cliente.bolivia@dorapass.local` | `DoraPass2026!` |
| Perú | `cliente.peru@dorapass.local` | `DoraPass2026!` |

Estas credenciales existen únicamente para desarrollo local. El proceso de seed restablece sus suscripciones para conservar los casos de 7, 3 y 1 día restante.

## Seguridad implementada

- Contraseñas protegidas con Argon2id.
- Sesiones aleatorias persistidas en PostgreSQL.
- Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Tokens de sesión y recuperación almacenados únicamente como hash SHA-256.
- Protección de propiedad en consultas de suscripciones y notificaciones.
- Límite de intentos de acceso y recuperación.
- Recuperación con token de un solo uso y vencimiento de 30 minutos.

En desarrollo, el enlace de recuperación se escribe en la salida del servidor. Antes de producción debe conectarse un proveedor de correo y definirse `NEXT_PUBLIC_APP_URL` con el dominio real.

## Reglas de vencimiento

- Más de 7 días: activa.
- Entre 4 y 7 días: aviso informativo.
- 3 días: por vencer.
- 1 día: alerta urgente.
- 0 días: vence hoy.
- Fecha superada: vencida.

Las fechas de negocio se calculan en `America/Lima` para Perú y `America/La_Paz` para Bolivia. Los días restantes no se almacenan; se calculan desde la fecha de vencimiento.
