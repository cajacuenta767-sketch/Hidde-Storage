alter table service_accounts
  add column if not exists encrypted_totp_secret text,
  add column if not exists totp_secret_iv text;

alter table service_accounts
  drop constraint if exists service_accounts_totp_secret_pair_check;

alter table service_accounts
  add constraint service_accounts_totp_secret_pair_check
  check (
    (encrypted_totp_secret is null and totp_secret_iv is null)
    or
    (encrypted_totp_secret is not null and totp_secret_iv is not null)
  );

alter table credential_access_events
  drop constraint if exists credential_access_events_secret_type_check;
alter table credential_access_events
  add constraint credential_access_events_secret_type_check
  check (secret_type in ('provider_email', 'provider_password', 'profile_pin', 'totp_code'));

alter table customer_credential_access_events
  drop constraint if exists customer_credential_access_events_secret_type_check;
alter table customer_credential_access_events
  add constraint customer_credential_access_events_secret_type_check
  check (secret_type in ('provider_email', 'provider_password', 'profile_pin', 'totp_code'));
