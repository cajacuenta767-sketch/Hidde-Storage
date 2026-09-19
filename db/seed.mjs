import { spawnSync } from 'node:child_process';
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Algorithm, hash } from '@node-rs/argon2';
import { config } from 'dotenv';

config({ path: '.env.local' });

const credentialsKey = Buffer.from(process.env.DORAPASS_CREDENTIALS_KEY ?? '', 'base64');
if (credentialsKey.length !== 32) {
  throw new Error('DORAPASS_CREDENTIALS_KEY debe contener 32 bytes en base64.');
}

function encryptCredential(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', credentialsKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    encryptedValue: Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function run(command, args, input) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    input,
    stdio: input === undefined ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} fallo`);
  }

  return result.stdout.trim();
}

const containerId = run('docker', ['compose', 'ps', '-q', 'postgres']);
if (!containerId) throw new Error('PostgreSQL no esta iniciado. Ejecuta: docker compose up -d postgres');

const existingProducts = run('docker', [
  'exec', containerId, 'psql', '-U', 'luma_pass', '-d', 'luma_pass', '-tAc',
  'select count(*) from products;',
]);

if (existingProducts === '0') {
  const seedSql = await readFile(join(process.cwd(), 'db', 'seed.sql'), 'utf8');
  run(
    'docker',
    ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
    seedSql,
  );
}

const assetManifest = JSON.parse(
  await readFile(join(process.cwd(), 'docs', 'PLATFORM_ASSETS.json'), 'utf8'),
);
const colorRows = assetManifest.assets.map(({ productSlug, backgroundColor, file, alt }) => {
  const safeSlug = productSlug.replaceAll("'", "''");
  const safeColor = backgroundColor.replaceAll("'", "''");
  const safeFile = file.replaceAll("'", "''");
  const safeAlt = alt.replaceAll("'", "''");
  return `('${safeSlug}', '${safeColor}', '${safeFile}', '${safeAlt}')`;
});

run(
  'docker',
  ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
  `update products as product
   set accent_color = colors.background_color,
       image_path = colors.image_path,
       image_alt = colors.image_alt,
       updated_at = now()
   from (values ${colorRows.join(',\n')}) as colors(slug, background_color, image_path, image_alt)
   where product.slug = colors.slug;`,
);

const definitiveCatalogSql = await readFile(
  join(process.cwd(), 'db', 'definitive-catalog.sql'),
  'utf8',
);
run(
  'docker',
  ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
  definitiveCatalogSql,
);

const pricingCatalogSql = await readFile(
  join(process.cwd(), 'db', 'pricing-catalog.sql'),
  'utf8',
);
run(
  'docker',
  ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
  pricingCatalogSql,
);

console.log('Catálogo definitivo aplicado con precios, descuentos y cambios oficiales.');

const demoPassword = 'DoraPass2026!';
const adminPassword = 'AdminDoraPass2026!';
const passwordHash = await hash(demoPassword, {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
});
const adminPasswordHash = await hash(adminPassword, {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
});
const escapedPasswordHash = passwordHash.replaceAll("'", "''");
const escapedAdminPasswordHash = adminPasswordHash.replaceAll("'", "''");

run(
  'docker',
  ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
  `insert into customers (full_name, email, phone_e164, market_code, password_hash, role, status)
   values
     ('Carlos Mendoza', 'cliente.bolivia@dorapass.local', '+59170000001', 'BO', '${escapedPasswordHash}', 'customer', 'active'),
     ('María Torres', 'cliente.peru@dorapass.local', '+51999900001', 'PE', '${escapedPasswordHash}', 'customer', 'active'),
     ('Administrador DoraPass', 'admin@dorapass.local', '+59170000000', 'BO', '${escapedAdminPasswordHash}', 'admin', 'active')
   on conflict (email) do update
   set full_name = excluded.full_name,
       phone_e164 = excluded.phone_e164,
       market_code = excluded.market_code,
       password_hash = excluded.password_hash,
       role = excluded.role,
       status = 'active',
       updated_at = now();

   delete from admin_audit_events
   where admin_customer_id = (
     select id from customers where email = 'admin@dorapass.local'
   );

   delete from subscriptions
   where customer_id in (
     select id from customers where email in ('cliente.bolivia@dorapass.local', 'cliente.peru@dorapass.local')
   );

   with demo_rows(email, product_slug, market_code, duration_months, day_offset, persisted_status) as (
     values
       ('cliente.bolivia@dorapass.local', 'netflix-sin-vpn', 'BO', 1, 18, 'active'),
       ('cliente.bolivia@dorapass.local', 'spotify-premium-individual', 'BO', 1, 3, 'active'),
       ('cliente.bolivia@dorapass.local', 'chatgpt-plus', 'BO', 1, 1, 'active'),
       ('cliente.bolivia@dorapass.local', 'disney-individual', 'BO', 1, 7, 'active'),
       ('cliente.bolivia@dorapass.local', 'max-individual', 'BO', 1, -3, 'expired'),
       ('cliente.peru@dorapass.local', 'netflix-con-vpn', 'PE', 1, 12, 'active'),
       ('cliente.peru@dorapass.local', 'spotify-premium-individual', 'PE', 1, 3, 'active')
   ), selected as (
     select
       customer.id as customer_id,
       product.id as product_id,
       offer.id as offer_variant_id,
       demo.persisted_status,
       demo.duration_months,
       demo.market_code,
       demo.day_offset,
       case
         when demo.market_code = 'PE' then timezone('America/Lima', now())::date
         else timezone('America/La_Paz', now())::date
       end as market_today,
       offer.amount_minor,
       case when demo.market_code = 'PE' then 'PEN' else 'BOB' end as currency
     from demo_rows demo
     join customers customer on customer.email = demo.email
     join products product on product.slug = demo.product_slug
     join offer_variants offer
       on offer.product_id = product.id
      and offer.market_code = demo.market_code
      and offer.duration_months = demo.duration_months
      and offer.access_type_code = 'PROFILE'
      and offer.amount_minor is not null
   ), inserted as (
     insert into subscriptions (
       customer_id, product_id, offer_variant_id, status, start_date, expires_at,
       warranty_until, access_type_code, duration_months, market_code,
       purchase_price_minor, currency
     )
     select
       customer_id,
       product_id,
       offer_variant_id,
       persisted_status,
       market_today - interval '12 days',
       market_today + day_offset * interval '1 day',
       market_today + day_offset * interval '1 day',
       'PROFILE',
       duration_months,
       market_code,
       amount_minor,
       currency
     from selected
     returning id, expires_at
   )
   insert into subscription_events (subscription_id, event_type, description, new_expires_at)
   select id, 'subscription_activated', 'Suscripción activada en DoraPass', expires_at
   from inserted;

   insert into renewal_requests (
     subscription_id, customer_id, offer_variant_id, status, base_expires_at,
     proposed_start_date, proposed_expires_at, price_minor, currency
   )
   select
     subscription.id,
     subscription.customer_id,
     renewal_offer.id,
     'pending_payment',
     subscription.expires_at,
     subscription.expires_at,
     (subscription.expires_at + interval '6 months')::date,
     renewal_offer.amount_minor,
     subscription.currency
   from subscriptions subscription
   join customers customer on customer.id = subscription.customer_id
   join products product on product.id = subscription.product_id
   join offer_variants renewal_offer
     on renewal_offer.product_id = subscription.product_id
    and renewal_offer.market_code = subscription.market_code
    and renewal_offer.access_type_code = subscription.access_type_code
    and renewal_offer.duration_months = 6
    and renewal_offer.amount_minor is not null
   where customer.email = 'cliente.bolivia@dorapass.local'
     and product.slug = 'chatgpt-plus';`,
);

const demoAccounts = [
  {
    code: 'DP-NF-001',
    productSlug: 'netflix-sin-vpn',
    plan: 'Premium · 4 perfiles',
    provider: 'Netflix',
    status: 'active',
    capacity: 4,
    renewalDays: 15,
    costMinor: 4200,
    currency: 'PEN',
    email: 'netflix.dp001@dorapass.local',
    password: 'N3tflix-Demo-2026!',
    notes: 'Cuenta principal de demostración para perfiles compartidos.',
  },
  {
    code: 'DP-DS-002',
    productSlug: 'disney-individual',
    plan: 'Premium · 4 perfiles',
    provider: 'Disney+',
    status: 'renewal_due',
    capacity: 4,
    renewalDays: 7,
    costMinor: 3400,
    currency: 'PEN',
    email: 'disney.dp002@dorapass.local',
    password: 'D1sney-Demo-2026!',
    notes: 'Renovación próxima; validar saldo antes del vencimiento.',
  },
  {
    code: 'DP-SP-003',
    productSlug: 'spotify-premium-individual',
    plan: 'Premium · 6 cupos',
    provider: 'Spotify',
    status: 'active',
    capacity: 6,
    renewalDays: 28,
    costMinor: 3600,
    currency: 'PEN',
    email: 'spotify.dp003@dorapass.local',
    password: 'Sp0tify-Demo-2026!',
    notes: 'Cuenta de música con capacidad para seis clientes.',
  },
  {
    code: 'DP-MX-004',
    productSlug: 'max-individual',
    plan: 'Estándar · 4 perfiles',
    provider: 'Max',
    status: 'maintenance',
    capacity: 4,
    renewalDays: 2,
    costMinor: 3000,
    currency: 'PEN',
    email: 'max.dp004@dorapass.local',
    password: 'M4x-Demo-2026!',
    notes: 'Cuenta temporalmente en revisión por acceso del proveedor.',
  },
].map((account) => ({
  ...account,
  emailSecret: encryptCredential(account.email),
  passwordSecret: encryptCredential(account.password),
}));

const accountValues = demoAccounts.map((account) =>
  `(${[
    sqlText(account.code),
    sqlText(account.productSlug),
    sqlText(account.plan),
    sqlText(account.provider),
    sqlText(account.status),
    account.capacity,
    account.renewalDays,
    account.costMinor,
    sqlText(account.currency),
    sqlText(account.emailSecret.encryptedValue),
    sqlText(account.emailSecret.iv),
    sqlText(account.passwordSecret.encryptedValue),
    sqlText(account.passwordSecret.iv),
    sqlText(account.notes),
  ].join(', ')})`,
);

const profileValues = demoAccounts.flatMap((account) =>
  Array.from({ length: account.capacity }, (_, index) => {
    const position = index + 1;
    const pin = encryptCredential(String(1100 + demoAccounts.indexOf(account) * 100 + position));
    return `(${sqlText(account.code)}, ${position}, ${sqlText(`Perfil ${position}`)}, ${sqlText(pin.encryptedValue)}, ${sqlText(pin.iv)})`;
  }),
);

run(
  'docker',
  ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
  `delete from service_accounts;

   with account_rows(
     internal_code, product_slug, plan_label, provider_label, status, capacity,
     renewal_days, cost_minor, cost_currency, encrypted_email, email_iv,
     encrypted_password, password_iv, notes
   ) as (
     values ${accountValues.join(',\n')}
   )
   insert into service_accounts (
     internal_code, product_id, plan_label, provider_label, status, capacity,
     renewal_date, cost_minor, cost_currency, encrypted_email, email_iv,
     encrypted_password, password_iv, notes
   )
   select
     row.internal_code, product.id, row.plan_label, row.provider_label, row.status,
     row.capacity, current_date + row.renewal_days, row.cost_minor, row.cost_currency,
     row.encrypted_email, row.email_iv, row.encrypted_password, row.password_iv, row.notes
   from account_rows row
   join products product on product.slug = row.product_slug;

   with profile_rows(internal_code, position, display_name, encrypted_pin, pin_iv) as (
     values ${profileValues.join(',\n')}
   )
   insert into account_profiles (
     service_account_id, position, display_name, encrypted_pin, pin_iv
   )
   select account.id, row.position, row.display_name, row.encrypted_pin, row.pin_iv
   from profile_rows row
   join service_accounts account on account.internal_code = row.internal_code;

   with assignment_rows(internal_code, profile_position, customer_email) as (
     values
       ('DP-NF-001', 1, 'cliente.bolivia@dorapass.local'),
       ('DP-NF-001', 2, 'cliente.peru@dorapass.local'),
       ('DP-DS-002', 1, 'cliente.bolivia@dorapass.local'),
       ('DP-SP-003', 1, 'cliente.bolivia@dorapass.local'),
       ('DP-SP-003', 2, 'cliente.peru@dorapass.local')
   )
   insert into profile_assignments (
     account_profile_id, subscription_id, customer_id, status, starts_at, expires_at,
     assigned_by_admin_customer_id
   )
   select
     profile.id, subscription.id, customer.id, 'active', subscription.start_date,
     subscription.expires_at, admin.id
   from assignment_rows row
   join service_accounts account on account.internal_code = row.internal_code
   join account_profiles profile
     on profile.service_account_id = account.id and profile.position = row.profile_position
   join products account_product on account_product.id = account.product_id
   join customers customer on customer.email = row.customer_email
   join subscriptions subscription on subscription.customer_id = customer.id
   join products subscription_product on subscription_product.id = subscription.product_id
     and subscription_product.service_name = account_product.service_name
   cross join lateral (
     select id from customers where email = 'admin@dorapass.local' limit 1
   ) admin
   where subscription.status in ('active', 'expiring');

   update account_profiles profile
   set status = 'assigned', updated_at = now()
   where exists (
     select 1 from profile_assignments assignment
     where assignment.account_profile_id = profile.id and assignment.status = 'active'
   );

   insert into account_incidents (
     service_account_id, incident_type, title, description, priority, status,
     opened_by_admin_customer_id
   )
   select
     account.id, 'provider_access', 'Acceso del proveedor en revisión',
     'El proveedor solicitó una verificación adicional. Mantener los perfiles bloqueados hasta validar el acceso.',
     'high', 'open', admin.id
   from service_accounts account
   cross join lateral (
     select id from customers where email = 'admin@dorapass.local' limit 1
   ) admin
   where account.internal_code = 'DP-MX-004';`,
);

run(
  'docker',
  ['exec', '-i', containerId, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'luma_pass', '-d', 'luma_pass'],
  `delete from payment_records;
   delete from service_account_cost_events;

   with rates as (
     select
       max(rate) filter (where base_currency = 'PEN' and quote_currency = 'BOB' and is_active) as pen_bob
     from exchange_rates
   ), ranked_subscriptions as (
     select
       subscription.id as subscription_id,
       subscription.*,
       row_number() over (order by subscription.id) as position,
       profile.service_account_id
     from subscriptions subscription
     left join profile_assignments assignment
       on assignment.subscription_id = subscription.id and assignment.status = 'active'
     left join account_profiles profile on profile.id = assignment.account_profile_id
     where subscription.customer_id in (
       select id from customers
       where email in ('cliente.bolivia@dorapass.local', 'cliente.peru@dorapass.local')
     )
   ), payment_rows as (
     select ranked.*, offsets.day_offset, offsets.source_type
     from ranked_subscriptions ranked
     cross join lateral (
       values
         ((array[2, 5, 8, 12, 16, 22, 27])[ranked.position::int], 'initial_purchase'),
         ((array[32, 35, 38, 42, 46, 52, 57])[ranked.position::int], 'renewal')
     ) offsets(day_offset, source_type)
   )
   insert into payment_records (
     subscription_id, service_account_id, customer_id, product_id, market_code,
     source_type, status, amount_minor, currency, reporting_amount_minor,
     reporting_currency, exchange_rate, payment_method_code, payment_reference,
     paid_at, confirmed_at, confirmed_by_admin_customer_id
   )
   select
     payment.subscription_id,
     payment.service_account_id,
     payment.customer_id,
     payment.product_id,
     payment.market_code,
     payment.source_type,
     'confirmed',
     payment.purchase_price_minor,
     payment.currency,
     round(
       payment.purchase_price_minor *
       case when payment.currency = 'PEN' then 1 else 1 / rates.pen_bob end
     )::int,
     'PEN',
     (case when payment.currency = 'PEN' then 1 else 1 / rates.pen_bob end)::numeric(14, 6),
     case when payment.market_code = 'PE' then 'yape' else 'qr_simple' end,
     'DEMO-' || payment.subscription_id || '-' || payment.day_offset,
     current_date - payment.day_offset + interval '15 hours',
     current_date - payment.day_offset + interval '15 hours',
     admin.id
   from payment_rows payment
   cross join rates
   cross join lateral (
     select id from customers where email = 'admin@dorapass.local' limit 1
   ) admin;

   with rates as (
     select
       max(rate) filter (where base_currency = 'USD' and quote_currency = 'PEN' and is_active) as usd_pen,
       max(rate) filter (where base_currency = 'PEN' and quote_currency = 'BOB' and is_active) as pen_bob
     from exchange_rates
   ), ranked_accounts as (
     select account.id as service_account_id, account.*, row_number() over (order by account.id) as position
     from service_accounts account
     where account.status <> 'archived' and account.cost_minor is not null
   ), cost_rows as (
     select ranked.*, offsets.day_offset
     from ranked_accounts ranked
     cross join lateral (
       values
         ((array[4, 7, 10, 13])[ranked.position::int]),
         ((array[34, 37, 40, 43])[ranked.position::int])
     ) offsets(day_offset)
   )
   insert into service_account_cost_events (
     service_account_id, cost_kind, amount_minor, currency, reporting_amount_minor,
     reporting_currency, exchange_rate, incurred_on, coverage_start, coverage_end,
     notes, created_by_admin_customer_id
   )
   select
     cost.service_account_id,
     'provider_renewal',
     cost.cost_minor,
     cost.cost_currency,
     round(
       cost.cost_minor * case
         when cost.cost_currency = 'PEN' then 1
         when cost.cost_currency = 'USD' then rates.usd_pen
         else 1 / rates.pen_bob
       end
     )::int,
     'PEN',
     (case
       when cost.cost_currency = 'PEN' then 1
       when cost.cost_currency = 'USD' then rates.usd_pen
       else 1 / rates.pen_bob
     end)::numeric(14, 6),
     current_date - cost.day_offset,
     current_date - cost.day_offset,
     current_date - cost.day_offset + interval '1 month',
     'Costo mensual de demostración de la cuenta proveedora.',
     admin.id
   from cost_rows cost
   cross join rates
   cross join lateral (
     select id from customers where email = 'admin@dorapass.local' limit 1
   ) admin;`,
);

console.log('Inventario de demostración creado con cuentas, perfiles, asignaciones e incidencias.');
console.log('Historial financiero de demostración creado con pagos y costos trazables.');

console.log('Clientes de demostración listos:');
console.log('  Bolivia: cliente.bolivia@dorapass.local / DoraPass2026!');
console.log('  Perú: cliente.peru@dorapass.local / DoraPass2026!');
console.log('  Admin: admin@dorapass.local / AdminDoraPass2026!');
