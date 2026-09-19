drop table if exists admin_audit_events;
drop index if exists renewal_requests_status_created_idx;
alter table renewal_requests drop constraint if exists renewal_requests_reviewed_by_customer_id_customers_id_fk;
alter table renewal_requests drop column if exists review_note;
alter table renewal_requests drop column if exists reviewed_at;
alter table renewal_requests drop column if exists reviewed_by_customer_id;
alter table customers drop constraint if exists customers_role_check;
alter table customers drop column if exists role;
