alter table offer_variants drop constraint if exists offer_variants_discount_range_check;
alter table offer_variants drop constraint if exists offer_variants_source_currency_check;
alter table offer_variants drop constraint if exists offer_variants_source_amount_positive_check;
alter table offer_variants drop column if exists pricing_source;
alter table offer_variants drop column if exists discount_basis_points;
alter table offer_variants drop column if exists exchange_rate;
alter table offer_variants drop column if exists source_amount_minor;
alter table offer_variants drop column if exists source_currency;
drop table if exists exchange_rates;
