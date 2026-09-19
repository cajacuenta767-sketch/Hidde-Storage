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

-- Los importes son los precios mensuales aprobados por el propietario.
-- USD y PEN se guardan en centavos; la moneda final se obtiene según el mercado.
with source_prices (slug, source_currency, source_amount_minor) as (values
  ('amazon-prime-video-individual', 'PEN', 800),
  ('apple-tv-individual', 'PEN', 1000),
  ('claro-video-individual', 'PEN', 1000),
  ('crunchyroll-fan', 'PEN', 800),
  ('crunchyroll-mega-fan', 'PEN', 800),
  ('dgo-directv-individual', 'PEN', 1000),
  ('disney-individual', 'PEN', 1000),
  ('hulu-individual', 'PEN', 800),
  ('max-individual', 'PEN', 800),
  ('movistar-tv-app-individual', 'PEN', 1000),
  ('netflix-con-vpn', 'PEN', 500),
  ('netflix-sin-vpn', 'PEN', 1500),
  ('paramount-individual', 'PEN', 800),
  ('vix-premium-individual', 'PEN', 800),
  ('amazon-music-unlimited-individual', 'PEN', 800),
  ('apple-music-individual', 'PEN', 800),
  ('deezer-premium-individual', 'PEN', 800),
  ('spotify-premium-individual', 'PEN', 1000),
  ('tidal-individual', 'PEN', 800),
  ('playstation-plus-essential', 'PEN', 2000),
  ('playstation-plus-extra', 'PEN', 3000),
  ('playstation-plus-deluxe', 'PEN', 3800),
  ('xbox-game-pass-core', 'PEN', 3500),
  ('xbox-game-pass-standard', 'PEN', 3000),
  ('xbox-game-pass-pc', 'PEN', 3500),
  ('xbox-game-pass-ultimate', 'PEN', 6000),
  ('chatgpt-plus', 'PEN', 1500),
  ('claude-pro', 'USD', 1500),
  ('claude-max', 'USD', 8000),
  ('cursor-pro', 'USD', 1500),
  ('elevenlabs-individual', 'USD', 1500),
  ('github-copilot-individual', 'USD', 1500),
  ('google-ai-plus', 'USD', 500),
  ('google-ai-ultra', 'USD', 500),
  ('google-ai-pro-gemini-pro', 'USD', 500),
  ('supergrok-individual', 'USD', 1500),
  ('microsoft-copilot-pro', 'USD', 800),
  ('perplexity-pro', 'USD', 1500),
  ('adobe-creative-cloud-individual', 'PEN', 2000),
  ('canva-pro', 'PEN', 500),
  ('google-one-individual', 'USD', 500),
  ('microsoft-365-personal', 'USD', 500),
  ('expressvpn-individual', 'PEN', 1000),
  ('nordvpn-individual', 'PEN', 1000),
  ('proton-vpn-individual', 'PEN', 1000),
  ('surfshark-individual', 'PEN', 1000),
  ('duolingo-super', 'PEN', 1000),
  ('duolingo-max', 'PEN', 1000)
),
duration_rules (months, factor_numerator, factor_denominator, discount_basis_points) as (values
  (1, 1::numeric, 1::numeric, 0),
  (3, 5::numeric, 6::numeric, 1667),
  (6, 35::numeric, 48::numeric, 2708),
  (12, 65::numeric, 96::numeric, 3229)
),
priced_variants as (
  select
    variant.id,
    source.source_currency,
    source.source_amount_minor,
    rule.discount_basis_points,
    case
      when source.source_currency = 'PEN' and variant.market_code = 'PE' then 1.000000::numeric
      when source.source_currency = 'USD' and variant.market_code = 'PE' then 3.352000::numeric
      when source.source_currency = 'PEN' and variant.market_code = 'BO' then 3.556086::numeric
      when source.source_currency = 'USD' and variant.market_code = 'BO' then 11.920000::numeric
    end as exchange_rate,
    (
      round((
        source.source_amount_minor::numeric
        * case
            when source.source_currency = 'PEN' and variant.market_code = 'PE' then 1.000000
            when source.source_currency = 'USD' and variant.market_code = 'PE' then 3.352000
            when source.source_currency = 'PEN' and variant.market_code = 'BO' then 3.556086
            when source.source_currency = 'USD' and variant.market_code = 'BO' then 11.920000
          end
        * rule.months
      ) / 100) * 100
    )::integer as compare_at_amount_minor,
    (
      round((
        source.source_amount_minor::numeric
        * case
            when source.source_currency = 'PEN' and variant.market_code = 'PE' then 1.000000
            when source.source_currency = 'USD' and variant.market_code = 'PE' then 3.352000
            when source.source_currency = 'PEN' and variant.market_code = 'BO' then 3.556086
            when source.source_currency = 'USD' and variant.market_code = 'BO' then 11.920000
          end
        * rule.months
        * rule.factor_numerator / rule.factor_denominator
      ) / 100) * 100
    )::integer as amount_minor
  from offer_variants variant
  join products product on product.id = variant.product_id
  join source_prices source on source.slug = product.slug
  join duration_rules rule on rule.months = variant.duration_months
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
    pricing_source = 'Tarifa aprobada por DoraPass · cambio oficial SBS/BCB',
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
