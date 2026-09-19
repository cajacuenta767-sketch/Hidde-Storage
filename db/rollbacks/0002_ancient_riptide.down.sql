begin;

drop table if exists payment_methods;
drop table if exists offer_variants;
drop table if exists durations;
drop table if exists access_types;
alter table markets drop column if exists currency_symbol;

commit;
