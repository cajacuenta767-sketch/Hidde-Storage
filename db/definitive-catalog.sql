begin;

insert into access_types (code, name, description, sort_order)
values
  ('PROFILE', 'Perfil', 'Acceso a un perfil asignado dentro de una cuenta administrada.', 10),
  ('FULL_ACCOUNT', 'Cuenta completa', 'Acceso exclusivo a una cuenta completa durante el periodo contratado.', 20)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into durations (months, label, sort_order)
values
  (1, '1 mes', 10),
  (3, '3 meses', 20),
  (6, '6 meses', 30),
  (12, '12 meses', 40)
on conflict (months) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update markets
set currency_symbol = case code when 'PE' then 'S/' when 'BO' then 'Bs' else currency_symbol end,
    is_active = true,
    updated_at = now()
where code in ('PE', 'BO');

update payment_methods
set is_active = false, updated_at = now()
where market_code in ('PE', 'BO');

insert into payment_methods (code, market_code, name, instructions, sort_order)
values
  ('WHATSAPP', 'PE', 'WhatsApp', 'Envía el resumen de tu compra directamente a DoraPass por WhatsApp.', 10),
  ('WHATSAPP', 'BO', 'WhatsApp', 'Envía el resumen de tu compra directamente a DoraPass por WhatsApp.', 10)
on conflict (code, market_code) do update set
  name = excluded.name,
  instructions = excluded.instructions,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update categories
set name = 'Cursos y aprendizaje', updated_at = now()
where slug = 'cursos-bienestar';

update products set is_active = false, updated_at = now();

update products
set slug = 'crunchyroll-fan', plan_name = 'Fan', updated_at = now()
where service_name = 'Crunchyroll' and plan_name = 'Fan / Mega Fan';

update products
set slug = 'playstation-plus-essential', plan_name = 'Essential', updated_at = now()
where service_name = 'PlayStation Plus' and plan_name = 'Individual';

update products
set slug = 'xbox-game-pass-core', plan_name = 'Core', updated_at = now()
where service_name = 'Xbox Game Pass' and plan_name = 'Individual';

update products
set slug = 'netflix-con-vpn', plan_name = 'Con VPN', updated_at = now()
where slug = 'netflix-individual';

update products
set slug = 'supergrok-individual', service_name = 'SuperGrok', updated_at = now()
where slug = 'grok-x-premium-individual';

insert into products (
  slug, category_id, service_name, plan_name, description, seller_label,
  billing_label, delivery_label, accent_color, accent_soft_color, artwork_class,
  mark, image_path, image_alt, is_active
)
select
  variant.slug, source.category_id, source.service_name, variant.plan_name,
  source.description, source.seller_label, source.billing_label, source.delivery_label,
  source.accent_color, source.accent_soft_color, source.artwork_class, source.mark,
  source.image_path, source.image_alt, true
from products source
cross join (values
  ('crunchyroll-mega-fan', 'Mega Fan')
) as variant(slug, plan_name)
where source.service_name = 'Crunchyroll' and source.plan_name = 'Fan'
on conflict (slug) do update set
  plan_name = excluded.plan_name,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  is_active = true,
  updated_at = now();

insert into products (
  slug, category_id, service_name, plan_name, description, seller_label,
  billing_label, delivery_label, accent_color, accent_soft_color, artwork_class,
  mark, image_path, image_alt, is_active
)
select
  'netflix-sin-vpn', source.category_id, source.service_name, 'Sin VPN',
  source.description, source.seller_label, source.billing_label, source.delivery_label,
  source.accent_color, source.accent_soft_color, source.artwork_class, source.mark,
  source.image_path, source.image_alt, true
from products source
where source.slug = 'netflix-con-vpn'
on conflict (slug) do update set
  service_name = excluded.service_name,
  plan_name = excluded.plan_name,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  is_active = true,
  updated_at = now();

insert into products (
  slug, category_id, service_name, plan_name, description, seller_label,
  billing_label, delivery_label, accent_color, accent_soft_color, artwork_class,
  mark, image_path, image_alt, is_active
)
select
  variant.slug, source.category_id, source.service_name, variant.plan_name,
  source.description, source.seller_label, source.billing_label, source.delivery_label,
  source.accent_color, source.accent_soft_color, source.artwork_class, source.mark,
  source.image_path, source.image_alt, true
from products source
cross join (values
  ('playstation-plus-extra', 'Extra'),
  ('playstation-plus-deluxe', 'Deluxe')
) as variant(slug, plan_name)
where source.service_name = 'PlayStation Plus' and source.plan_name = 'Essential'
on conflict (slug) do update set
  plan_name = excluded.plan_name,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  is_active = true,
  updated_at = now();

insert into products (
  slug, category_id, service_name, plan_name, description, seller_label,
  billing_label, delivery_label, accent_color, accent_soft_color, artwork_class,
  mark, image_path, image_alt, is_active
)
select
  variant.slug, source.category_id, source.service_name, variant.plan_name,
  source.description, source.seller_label, source.billing_label, source.delivery_label,
  source.accent_color, source.accent_soft_color, source.artwork_class, source.mark,
  source.image_path, source.image_alt, true
from products source
cross join (values
  ('xbox-game-pass-standard', 'Standard'),
  ('xbox-game-pass-pc', 'PC'),
  ('xbox-game-pass-ultimate', 'Ultimate')
) as variant(slug, plan_name)
where source.service_name = 'Xbox Game Pass' and source.plan_name = 'Core'
on conflict (slug) do update set
  plan_name = excluded.plan_name,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  is_active = true,
  updated_at = now();

update products
set is_active = true, updated_at = now()
where slug in (
  'amazon-prime-video-individual', 'apple-tv-individual', 'claro-video-individual',
  'crunchyroll-fan', 'crunchyroll-mega-fan', 'dgo-directv-individual',
  'disney-individual', 'hulu-individual', 'max-individual',
  'movistar-tv-app-individual', 'netflix-con-vpn', 'netflix-sin-vpn', 'paramount-individual',
  'vix-premium-individual', 'amazon-music-unlimited-individual',
  'apple-music-individual', 'deezer-premium-individual',
  'spotify-premium-individual', 'tidal-individual',
  'playstation-plus-essential', 'playstation-plus-extra', 'playstation-plus-deluxe',
  'xbox-game-pass-core', 'xbox-game-pass-standard', 'xbox-game-pass-pc',
  'xbox-game-pass-ultimate', 'chatgpt-plus', 'chatgpt-pro', 'claude-max',
  'claude-pro', 'cursor-pro', 'elevenlabs-individual', 'github-copilot-individual',
  'google-ai-plus', 'google-ai-ultra', 'google-ai-pro-gemini-pro',
  'supergrok-individual', 'microsoft-copilot-pro', 'perplexity-pro',
  'adobe-creative-cloud-individual', 'canva-pro', 'google-one-individual',
  'microsoft-365-personal', 'proton-vpn-individual', 'nordvpn-individual',
  'expressvpn-individual', 'surfshark-individual', 'duolingo-max', 'duolingo-super'
);

update products
set delivery_label = 'Entrega tras confirmar el pago', updated_at = now()
where is_active = true;

update products
set sort_order = case
  when service_name = 'Crunchyroll' and plan_name = 'Fan' then 10
  when service_name = 'Crunchyroll' and plan_name = 'Mega Fan' then 20
  when service_name = 'ChatGPT' and plan_name = 'Plus' then 10
  when service_name = 'ChatGPT' and plan_name = 'Pro' then 20
  when service_name = 'Claude' and plan_name = 'Pro' then 10
  when service_name = 'Claude' and plan_name = 'Max' then 20
  when service_name = 'Google AI' and plan_name = 'Plus' then 10
  when service_name = 'Google AI' and plan_name = 'Ultra' then 20
  when service_name = 'PlayStation Plus' and plan_name = 'Essential' then 10
  when service_name = 'PlayStation Plus' and plan_name = 'Extra' then 20
  when service_name = 'PlayStation Plus' and plan_name = 'Deluxe' then 30
  when service_name = 'Xbox Game Pass' and plan_name = 'Core' then 10
  when service_name = 'Xbox Game Pass' and plan_name = 'Standard' then 20
  when service_name = 'Xbox Game Pass' and plan_name = 'PC' then 30
  when service_name = 'Xbox Game Pass' and plan_name = 'Ultimate' then 40
  when service_name = 'Duolingo' and plan_name = 'Super' then 10
  when service_name = 'Duolingo' and plan_name = 'Max' then 20
  when service_name = 'Netflix' and plan_name = 'Con VPN' then 10
  when service_name = 'Netflix' and plan_name = 'Sin VPN' then 20
  else 10
end,
updated_at = now()
where is_active = true;

update market_prices price
set is_active = product.is_active, updated_at = now()
from products product
where product.id = price.product_id;

update offer_variants variant
set is_active = false, updated_at = now()
from products product
where product.id = variant.product_id and product.is_active = false;

insert into offer_variants (
  product_id, access_type_code, duration_months, market_code, amount_minor,
  compare_at_amount_minor, stock, delivery_label, warranty_days, is_active
)
select
  product.id,
  access_type.code,
  duration.months,
  market.code,
  null,
  null,
  0,
  'Entrega después de confirmar el pago',
  case duration.months when 1 then 30 when 3 then 90 when 6 then 180 else 365 end,
  true
from products product
cross join access_types access_type
cross join durations duration
cross join markets market
where product.is_active = true
  and access_type.is_active = true
  and duration.is_active = true
  and market.is_active = true
on conflict (product_id, access_type_code, duration_months, market_code) do update set
  delivery_label = excluded.delivery_label,
  warranty_days = excluded.warranty_days,
  is_active = true,
  updated_at = now();

commit;
