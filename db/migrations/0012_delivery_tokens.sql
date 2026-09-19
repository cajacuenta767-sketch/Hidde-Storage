alter table purchase_orders drop constraint if exists purchase_orders_status_check;
alter table purchase_orders add constraint purchase_orders_status_check
  check (status in (
    'pending_payment', 'payment_review', 'paid', 'fulfilling',
    'token_issued', 'delivered', 'expired', 'cancelled', 'failed',
    'rejected', 'refunded'
  ));

create table delivery_tokens (
  id bigint generated always as identity primary key,
  order_id bigint not null references purchase_orders(id) on delete cascade,
  token_hash text not null,
  status text not null default 'active',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  used_at timestamptz,
  generated_by_admin_customer_id bigint not null references customers(id) on delete restrict,
  source text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_tokens_status_check
    check (status in ('active', 'used', 'expired', 'revoked')),
  constraint delivery_tokens_attempts_check check (attempts >= 0),
  constraint delivery_tokens_max_attempts_check check (max_attempts > 0),
  constraint delivery_tokens_source_check check (source in ('admin', 'telegram'))
);

create unique index delivery_tokens_hash_uidx on delivery_tokens(token_hash);
create unique index delivery_tokens_active_order_uidx
  on delivery_tokens(order_id) where status = 'active';
create index delivery_tokens_order_idx on delivery_tokens(order_id, created_at);
create index delivery_tokens_expiry_idx on delivery_tokens(status, expires_at);
