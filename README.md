# DoraPass

Marketplace de suscripciones de streaming para **Perú y Bolivia**, con pago en
medios locales (Yape, Plin, QR, transferencia). Incluye tienda pública, portal
de clientes, panel administrativo completo, inventario de cuentas/perfiles,
entrega por token, códigos TOTP y OTP por correo, solicitudes de reposición de
stock y un bot privado de Telegram para el administrador.

> **Estado actual:** el flujo de venta funciona de punta a punta con
> **confirmación manual de pago** (el cliente paga por WhatsApp/Yape y el
> administrador confirma desde el panel o Telegram). La integración con
> pasarelas de pago automáticas está pendiente; ver
> [Pendientes](#pendientes-para-producción).

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16.3 (App Router, Server Actions) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 + shadcn/Base UI + CSS propio en `app/globals.css` |
| Base de datos | PostgreSQL 15+ con Drizzle ORM (`drizzle-orm` + driver `postgres`) |
| Calidad | oxlint (lint), oxfmt (formato), `node --test` (pruebas) |
| Integraciones | Bot de Telegram (admin), IMAP/NotLetters (OTP de correo) |

## Requisitos

- **Node.js >= 22.13** (declarado en `package.json > engines`)
- **Docker + Docker Compose** (para el PostgreSQL local; ver alternativa sin
  Docker más abajo)
- npm

## Puesta en marcha desde cero

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/cajacuenta767-sketch/Hidde-Storage
cd Hidde-Storage
npm install

# 2. Crear el archivo de entorno
cp .env.example .env.local
# Generar las dos claves obligatorias (32 bytes en base64 cada una):
openssl rand -base64 32   # → pegar en DORAPASS_CREDENTIALS_KEY
openssl rand -base64 32   # → pegar en DORAPASS_DELIVERY_TOKEN_SECRET

# 3. Levantar PostgreSQL (puerto local 55433)
docker compose up -d postgres

# 4. Aplicar migraciones y cargar catálogo + datos de demostración
npm run db:migrate
npm run db:seed

# 5. Iniciar la aplicación
npm run dev
# → http://127.0.0.1:3000  (tienda)
# → http://127.0.0.1:3000/admin  (panel administrador)
```

`npm run db:seed` es idempotente: carga mercados, catálogo definitivo con
precios (115 productos, ~780 variantes), métodos de pago y cuentas de
demostración, y restablece las suscripciones demo.

### Cuentas de demostración (solo desarrollo local)

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin@dorapass.local` | `AdminDoraPass2026!` |
| Cliente Perú | `cliente.peru@dorapass.local` | `DoraPass2026!` |
| Cliente Bolivia | `cliente.bolivia@dorapass.local` | `DoraPass2026!` |

**Reemplazar antes de publicar el sitio.**

### Alternativa sin Docker

`db/migrate.mjs` y `db/seed.mjs` ejecutan `psql` dentro del contenedor de
Docker Compose. Si usas un PostgreSQL propio:

1. Crea la base y el usuario que prefieras y ajusta `DATABASE_URL` en
   `.env.local`.
2. Aplica a mano, **en orden alfabético**, cada archivo de
   `db/migrations/*.sql` (con `psql -v ON_ERROR_STOP=1 -f <archivo>`).
3. Aplica `db/seed.sql`, luego `db/definitive-catalog.sql` y
   `db/pricing-catalog.sql`.
4. Las cuentas de demostración cifradas solo las crea `db/seed.mjs`; sin
   Docker puedes registrar usuarios desde `/registro` y promover el admin con:
   `update customers set role = 'admin' where email = '<tu-correo>';`

Esta secuencia (migraciones → seed → catálogos) está verificada sobre una base
completamente vacía.

## Variables de entorno (`.env.local`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL. Con Docker Compose: `postgres://luma_pass:luma_pass_local@127.0.0.1:55433/luma_pass` |
| `DORAPASS_CREDENTIALS_KEY` | Sí | 32 bytes en base64. Cifra (AES-256-GCM) correos, contraseñas y PIN de las cuentas de streaming en BD |
| `DORAPASS_DELIVERY_TOKEN_SECRET` | Sí | Secreto HMAC de los tokens de entrega `DP-XXXX-XXXX` |
| `DORAPASS_WHATSAPP_NUMBER` | Sí | Número que recibe los pedidos por WhatsApp |
| `NEXT_PUBLIC_APP_URL` | Sí | URL pública de la app (enlaces en Telegram y recuperación de contraseña) |
| `TELEGRAM_BOT_TOKEN` | No | Token del bot privado del admin (ver `docs/TELEGRAM_DELIVERY_SETUP.md`) |
| `TELEGRAM_WEBHOOK_SECRET` | No | Secreto del webhook de Telegram |
| `TELEGRAM_ADMIN_CHAT_IDS` | No | IDs de chat del admin, separados por coma |
| `TELEGRAM_ADMIN_EMAIL` | No | Correo del admin que ejecuta acciones desde Telegram |
| `NOTLETTERS_API_TOKEN` | No | Token de NotLetters para leer OTP de correo vía API |

Sin las variables de Telegram la app funciona igual; simplemente no se envían
avisos al bot.

## Scripts npm

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run db:migrate` | Aplica `db/migrations/*.sql` pendientes (tabla de control `luma_schema_migrations`) |
| `npm run db:seed` | Carga catálogo, precios y cuentas demo (idempotente) |
| `npm run db:studio` | Drizzle Studio |
| `npm run lint` | oxlint |
| `npm run format` | oxfmt |
| `npm run test:subscriptions` | Pruebas de fechas de suscripción |
| `npm run telegram:*` | Utilidades del bot (status, chat-id, register, remove, test) |

## Estructura del proyecto

```
app/
  (auth)/            Ingreso, registro, recuperar/restablecer contraseña
  actions/           Server Actions: auth, cuenta, admin, inventario,
                     pedidos de compra, solicitudes de stock
  admin/             Panel administrador (resumen, pedidos, inventario,
                     solicitudes de stock, asignaciones, suscripciones,
                     clientes, incidencias, configuración)
  api/               checkout, canje de token, TOTP, OTP de correo,
                     webhook de Telegram
  mi-cuenta/         Portal del cliente (suscripciones, pedidos,
                     notificaciones, perfil, soporte)
  pedido/[publicId]/ Página pública del pedido (canje de token)
  page.tsx           Tienda (marketplace)
components/          UI por dominio: marketplace, admin, account, auth, ui
db/
  schema/index.ts    Esquema Drizzle completo (35 tablas)
  migrations/        SQL numerado 0000–0015 (aplicar en orden)
  rollbacks/         *.down.sql para revertir migraciones
  seed.sql           Mercados, categorías, métodos de pago, datos base
  definitive-catalog.sql / pricing-catalog.sql  Catálogo y precios
lib/
  auth/              Sesiones, Argon2id, rate limiting, validación (Zod)
  catalog.ts         Consulta del catálogo para la tienda
  orders/            Checkout, confirmación de pago + asignación
                     automática de inventario, tokens de entrega
  subscriptions/     Fechas/vencimientos (America/Lima y America/La_Paz),
                     acceso a credenciales
  admin/             Consultas y mutaciones del panel (incluye
                     stock-requests.ts)
  integrations/      Telegram, OTP por correo (IMAP/NotLetters)
  security/          Cifrado de credenciales, TOTP
docs/                Documentación funcional y de negocio (ver índice abajo)
tests/               Pruebas con node --test
```

## Funcionalidades

### Tienda y clientes

- Catálogo por mercado (PE/BO) con variantes por tipo de acceso
  (perfil/cuenta completa), duración y precio en moneda local.
- Checkout que crea pedidos con expiración de 24 h; pago coordinado por
  WhatsApp.
- **Solicitudes de stock:** los productos agotados no se ocultan; muestran
  "Sin stock disponible" y el botón **"Avísame cuando haya stock"**. La
  solicitud se registra sin duplicados (índice único parcial), con límite de
  intentos, y notifica al admin por Telegram.
- Autenticación completa: Argon2id, sesiones en BD con cookie HttpOnly,
  tokens hasheados (SHA-256), rate limiting, recuperación con token de un
  solo uso (en desarrollo el enlace se imprime en la consola del servidor).
- Portal del cliente: suscripciones con estados por vencimiento
  (7/3/1/0 días), credenciales bajo token, generador TOTP, lectura de OTP
  que llegan por correo (remitentes validados), pedidos, notificaciones,
  perfil y soporte.

### Panel administrador (`/admin`)

- Resumen operativo, pedidos con confirmación manual de pago (protegido
  contra doble aprobación), renovaciones, clientes y suscripciones.
- Inventario: cuentas de servicio, perfiles, costos, asignaciones,
  reservas e incidencias.
- **Solicitudes de stock (`/admin/solicitudes`):** agrupa las solicitudes
  pendientes por variante con la lista de clientes en espera; un formulario
  actualiza el stock y **notifica en la app a todos los clientes en espera**;
  también permite descartar solicitudes. Todo queda en la auditoría
  (`admin_audit_events`).
- Bot de Telegram privado: aviso de pedido nuevo, confirmación de pago con un
  botón, token de entrega automático con mensaje listo para pegar en
  WhatsApp, aviso de falta de inventario y aviso de solicitud de stock.
  Comandos `/pedido` y `/token` como respaldo.

### Flujo de venta actual (confirmación manual)

1. El cliente compra en la web → pedido `pending_payment` (24 h) → paga por
   WhatsApp/Yape/Plin.
2. El admin verifica el pago y lo confirma (panel o botón de Telegram).
3. El sistema **asigna automáticamente** un perfil/cuenta libre del
   inventario (bloqueo transaccional `for update skip locked`), crea la
   suscripción y genera el token de entrega.
4. El admin envía el token al cliente por WhatsApp (Telegram entrega el
   mensaje listo para copiar).
5. El cliente canjea el token en `/pedido/<id>` y ve sus credenciales;
   desde su cuenta accede a TOTP/OTP cuando aplica.
6. Si no hay inventario, el pedido queda `awaiting_inventory` y Telegram
   avisa al admin.

### Flujo de solicitudes de stock

1. Cliente logueado pulsa "Avísame cuando haya stock" en una opción agotada.
2. Se registra en `stock_requests` (una solicitud pendiente por cliente y
   variante) y el admin recibe el detalle por Telegram (producto, plan,
   duración, país, cliente y cuántos esperan).
3. El admin repone y actualiza el stock desde `/admin/solicitudes`; cada
   cliente en espera recibe una notificación en su cuenta y la solicitud
   queda `fulfilled` (o `dismissed` si se descarta).

## Base de datos

- Esquema completo en `db/schema/index.ts` (35 tablas): catálogo, clientes y
  sesiones, pedidos, suscripciones y eventos, inventario (cuentas, perfiles,
  reservas, asignaciones, incidencias, costos), pagos (registros, intentos,
  webhooks — preparada para pasarelas), tokens de entrega, secretos TOTP,
  OTP por correo, solicitudes de stock y auditorías.
- Migraciones SQL numeradas en `db/migrations/` con rollback en
  `db/rollbacks/`. `npm run db:migrate` lleva el control en
  `luma_schema_migrations`. Para una migración nueva: crear
  `00NN_nombre.sql` + `00NN_nombre.down.sql` y actualizar
  `db/schema/index.ts` para que refleje lo mismo.
- Referencia detallada en `docs/DATABASE.md`.

## Calidad

```bash
npm run lint                    # oxlint (hay avisos preexistentes en components/ui)
npx tsc --noEmit                # tipos
npm run test:subscriptions      # pruebas de fechas
npm run build                   # build de producción (requiere DATABASE_URL definida)
```

## Pendientes para producción

- **Pasarela de pagos automática** (Culqi/Mercado Pago para PE; por definir
  en BO). Las tablas `payment_attempts` y `payment_webhook_events` ya
  existen; falta el endpoint de webhook y adaptar
  `lib/orders/confirmation.ts` para un actor "sistema"
  (`confirmationSource` distinto de `manual`).
- **Proveedor de correo** (Resend/SES/etc.) para recuperación de contraseña
  y avisos; hoy el enlace de recuperación solo se imprime en consola.
- **Entrega sin humano:** hoy el token viaja por WhatsApp manualmente;
  con pasarela + correo se puede mostrar el acceso directo en la cuenta.
- **Tareas programadas** (cron): expirar pedidos no pagados, marcar
  suscripciones vencidas, recordatorios de renovación.
- Reemplazar credenciales demo, configurar dominio real en
  `NEXT_PUBLIC_APP_URL` y secretos definitivos.

## Notas para agentes de IA

- **Lee `AGENTS.md` primero**: la versión de Next.js incluida tiene cambios
  incompatibles; consulta las guías en `node_modules/next/dist/docs/` antes
  de escribir código (existen tras `npm install`).
- Convenciones del código: UI y mensajes en **español**; Server Actions en
  `app/actions/*` con `'use server'` y estados `{ status, message }`;
  consultas de servidor en `lib/**` con `import 'server-only'`; dinero en
  centavos (`amount_minor`); fechas de negocio en `America/Lima` /
  `America/La_Paz` (helpers en `lib/subscriptions/dates.ts`); nunca
  almacenar credenciales en claro (usar `lib/security/credentials.ts`).
- Migraciones: SQL a mano, numeradas y con rollback (ver sección Base de
  datos). No edites migraciones ya aplicadas salvo para arreglar una
  instalación desde cero.
- Validación mínima antes de subir cambios: `npx tsc --noEmit`,
  `npm run lint` (sin errores nuevos), `npm run test:subscriptions` y
  `npm run build`.

## Índice de documentación (`docs/`)

| Documento | Contenido |
| --- | --- |
| `SDD.md` | Diseño del sistema |
| `DATABASE.md` | Esquema y decisiones de base de datos |
| `ADMIN_PORTAL.md` | Manual del panel administrador |
| `CUSTOMER_PORTAL.md` | Manual del portal de clientes |
| `TELEGRAM_DELIVERY_SETUP.md` | Configuración paso a paso del bot de Telegram |
| `MODELO_NEGOCIO.md` | Modelo de negocio y restricciones por plataforma |
| `CATALOGO_SERVICIOS.md` | Catálogo maestro y modalidades permitidas |
| `ESTRATEGIA_COMERCIAL.md` | Estrategia comercial |
