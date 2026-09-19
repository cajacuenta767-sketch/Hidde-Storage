begin;

update exchange_rates set is_active = false, updated_at = now();

insert into exchange_rates (
  base_currency, quote_currency, rate, source_name, source_url, effective_date, is_active
)
values
  (
    'USD', 'PEN', 3.352000, 'SBS Perú — Tipo de cambio contable',
    'https://www.sbs.gob.pe/app/pp/SISTIP_PORTAL/Paginas/Publicacion/TipoCambioContable.aspx',
    '2026-08-28', true
  ),
  (
    'USD', 'BOB', 11.920000, 'Banco Central de Bolivia — Tipo de cambio oficial',
    'https://www.bcb.gob.bo/librerias/indicadores/dolar/bolsin.php',
    '2026-08-29', true
  ),
  (
    'PEN', 'BOB', 3.556086, 'Cruce oficial calculado BCB/SBS',
    'https://www.bcb.gob.bo/librerias/indicadores/dolar/bolsin.php',
    '2026-08-29', true
  )
on conflict (base_currency, quote_currency, effective_date) do update set
  rate = excluded.rate,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  is_active = true,
  updated_at = now();

-- Precios investigados el 2026-09-19 (ver docs/PRECIOS_MERCADO_2026-09.md).
-- source_amount_minor = precio típico de reventa online del perfil/cuenta +10%.
-- official_amount_minor = precio oficial mensual del plan (misma moneda);
--   0 significa "sin referencia oficial confiable" y no se muestra comparación.
-- Ambos en centavos; la moneda final se obtiene según el mercado.
with source_prices (slug, source_currency, source_amount_minor, official_amount_minor) as (values
  ('amazon-prime-video-individual', 'PEN', 990, 2590),
  ('apple-tv-individual', 'PEN', 1650, 2490),
  ('claro-video-individual', 'PEN', 1100, 990),
  ('crunchyroll-fan', 'PEN', 660, 1990),
  ('crunchyroll-mega-fan', 'PEN', 880, 2390),
  ('dgo-directv-individual', 'PEN', 1100, 5400),
  ('disney-individual', 'PEN', 1210, 4990),
  ('hulu-individual', 'PEN', 1650, 4020),
  ('max-individual', 'PEN', 1100, 4090),
  ('movistar-tv-app-individual', 'PEN', 1100, 7000),
  ('netflix-con-vpn', 'PEN', 550, 4090),
  ('netflix-sin-vpn', 'PEN', 1100, 4090),
  ('paramount-individual', 'PEN', 1100, 1890),
  ('vix-premium-individual', 'PEN', 1210, 2290),
  ('amazon-music-unlimited-individual', 'PEN', 880, 4020),
  ('apple-music-individual', 'PEN', 1650, 1690),
  ('deezer-premium-individual', 'PEN', 1160, 4020),
  ('spotify-premium-individual', 'PEN', 1100, 2090),
  ('tidal-individual', 'PEN', 940, 4020),
  ('playstation-plus-essential', 'PEN', 2090, 2340),
  ('playstation-plus-extra', 'PEN', 5390, 3520),
  ('playstation-plus-deluxe', 'PEN', 5720, 4020),
  ('xbox-game-pass-core', 'PEN', 3850, 3350),
  ('xbox-game-pass-standard', 'PEN', 3300, 5020),
  ('xbox-game-pass-pc', 'PEN', 3850, 4690),
  ('xbox-game-pass-ultimate', 'PEN', 3960, 7710),
  ('chatgpt-plus', 'PEN', 2200, 6700),
  ('claude-pro', 'USD', 660, 2000),
  ('claude-max', 'USD', 5500, 10000),
  ('cursor-pro', 'USD', 1320, 2000),
  ('elevenlabs-individual', 'USD', 1320, 2200),
  ('github-copilot-individual', 'USD', 550, 1000),
  ('google-ai-plus', 'USD', 330, 799),
  ('google-ai-ultra', 'USD', 550, 9999),
  ('google-ai-pro-gemini-pro', 'USD', 440, 1999),
  ('supergrok-individual', 'USD', 550, 3000),
  ('microsoft-copilot-pro', 'USD', 770, 2000),
  ('perplexity-pro', 'USD', 330, 2000),
  ('adobe-creative-cloud-individual', 'PEN', 2200, 18440),
  ('canva-pro', 'PEN', 1490, 4490),
  ('google-one-individual', 'PEN', 770, 3350),
  ('microsoft-365-personal', 'PEN', 2090, 3100),
  ('expressvpn-individual', 'PEN', 990, 5360),
  ('nordvpn-individual', 'PEN', 880, 5020),
  ('proton-vpn-individual', 'PEN', 770, 3350),
  ('surfshark-individual', 'PEN', 990, 5510),
  ('duolingo-super', 'PEN', 1650, 0),
  ('duolingo-max', 'PEN', 2200, 3000)
),
duration_rules (months, factor_numerator, factor_denominator) as (values
  (1, 1::numeric, 1::numeric),
  (3, 5::numeric, 6::numeric),
  (6, 35::numeric, 48::numeric),
  (12, 65::numeric, 96::numeric)
),
priced_variants as (
  select
    variant.id,
    source.source_currency,
    source.source_amount_minor,
    fx.exchange_rate,
    computed.amount_minor,
    case
      when computed.official_total_minor > computed.amount_minor
        then computed.official_total_minor
      else null
    end as compare_at_amount_minor,
    case
      when computed.official_total_minor > computed.amount_minor
        then round(
          (1 - computed.amount_minor::numeric / computed.official_total_minor)
          * 10000
        )::integer
      else 0
    end as discount_basis_points
  from offer_variants variant
  join products product on product.id = variant.product_id
  join source_prices source on source.slug = product.slug
  join duration_rules rule on rule.months = variant.duration_months
  cross join lateral (
    select case
      when source.source_currency = 'PEN' and variant.market_code = 'PE' then 1.000000::numeric
      when source.source_currency = 'USD' and variant.market_code = 'PE' then 3.352000::numeric
      when source.source_currency = 'PEN' and variant.market_code = 'BO' then 3.556086::numeric
      when source.source_currency = 'USD' and variant.market_code = 'BO' then 11.920000::numeric
    end as exchange_rate
  ) fx
  cross join lateral (
    select
      (
        round((
          source.source_amount_minor::numeric
          * fx.exchange_rate
          * rule.months
          * rule.factor_numerator / rule.factor_denominator
        ) / 100) * 100
      )::integer as amount_minor,
      (
        round((
          source.official_amount_minor::numeric
          * fx.exchange_rate
          * rule.months
        ) / 100) * 100
      )::integer as official_total_minor
  ) computed
  where product.is_active = true
    and variant.is_active = true
    and variant.access_type_code = 'PROFILE'
)
update offer_variants variant
set amount_minor = priced.amount_minor,
    compare_at_amount_minor = priced.compare_at_amount_minor,
    source_currency = priced.source_currency,
    source_amount_minor = priced.source_amount_minor,
    exchange_rate = priced.exchange_rate,
    discount_basis_points = priced.discount_basis_points,
    pricing_source = 'Precio de mercado online +10% (sep-2026) · comparación: tarifa oficial del plan',
    stock = 100,
    updated_at = now()
from priced_variants priced
where variant.id = priced.id;

-- Las cuentas completas y los planes sin tarifa aprobada no deben mostrar precios inventados.
update offer_variants variant
set amount_minor = null,
    compare_at_amount_minor = null,
    source_currency = null,
    source_amount_minor = null,
    exchange_rate = null,
    discount_basis_points = 0,
    pricing_source = '',
    stock = 0,
    updated_at = now()
from products product
where product.id = variant.product_id
  and product.is_active = true
  and (
    variant.access_type_code = 'FULL_ACCOUNT'
    or product.slug = 'chatgpt-pro'
  );

insert into market_prices (product_id, market_code, amount_minor, is_active)
select variant.product_id, variant.market_code, variant.amount_minor, true
from offer_variants variant
join products product on product.id = variant.product_id
where product.is_active = true
  and variant.is_active = true
  and variant.access_type_code = 'PROFILE'
  and variant.duration_months = 1
  and variant.amount_minor is not null
on conflict (product_id, market_code) do update set
  amount_minor = excluded.amount_minor,
  is_active = true,
  updated_at = now();

commit;
