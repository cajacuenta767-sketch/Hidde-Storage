alter table service_accounts
  add column if not exists otp_inbox_provider text,
  add column if not exists otp_inbox_host text,
  add column if not exists encrypted_otp_inbox_email text,
  add column if not exists otp_inbox_email_iv text,
  add column if not exists encrypted_otp_inbox_password text,
  add column if not exists otp_inbox_password_iv text;

alter table service_accounts
  add constraint service_accounts_email_otp_credentials_check
  check (
    (otp_inbox_provider is null and otp_inbox_host is null and encrypted_otp_inbox_email is null and otp_inbox_email_iv is null and encrypted_otp_inbox_password is null and otp_inbox_password_iv is null)
    or
    (otp_inbox_provider is not null and otp_inbox_host is not null and encrypted_otp_inbox_email is not null and otp_inbox_email_iv is not null and encrypted_otp_inbox_password is not null and otp_inbox_password_iv is not null)
  );

alter table credential_access_events drop constraint if exists credential_access_events_secret_type_check;
alter table credential_access_events add constraint credential_access_events_secret_type_check
  check (secret_type in ('provider_email', 'provider_password', 'profile_pin', 'totp_code', 'email_otp_code'));

alter table customer_credential_access_events drop constraint if exists customer_credential_access_events_secret_type_check;
alter table customer_credential_access_events add constraint customer_credential_access_events_secret_type_check
  check (secret_type in ('provider_email', 'provider_password', 'profile_pin', 'totp_code', 'email_otp_code'));

create table if not exists email_otp_lookup_events (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  subscription_id bigint not null references subscriptions(id) on delete cascade,
  status text not null check (status in ('found', 'not_found', 'error')),
  created_at timestamptz not null default now()
);
create index if not exists email_otp_lookup_events_rate_idx
  on email_otp_lookup_events(customer_id, subscription_id, created_at);
