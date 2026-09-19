begin;

delete from payment_methods where market_code = 'PE' and code = 'CULQI_QR';
update payment_methods
set is_active = true, updated_at = now()
where market_code = 'PE' and code in ('YAPE', 'PLIN');

alter table profile_assignments drop constraint if exists profile_assignments_source_check;
alter table profile_assignments drop column if exists assignment_source;
alter table profile_assignments alter column assigned_by_admin_customer_id set not null;

alter table payment_records drop constraint if exists payment_records_confirmation_source_check;
alter table payment_records drop column if exists confirmation_source;
alter table payment_records alter column confirmed_by_admin_customer_id set not null;

drop table if exists profile_reservations;
drop table if exists payment_webhook_events;
drop table if exists payment_attempts;
drop table if exists purchase_order_items;
drop table if exists purchase_orders;

commit;
