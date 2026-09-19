begin;

alter table products drop column if exists sort_order;

commit;
