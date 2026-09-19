create table if not exists stock_requests (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  offer_variant_id bigint not null references offer_variants(id) on delete cascade,
  market_code text not null references markets(code) on delete restrict,
  status text not null default 'pending',
  resolved_at timestamptz,
  resolved_by_admin_customer_id bigint references customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_requests_status_check
    check (status in ('pending', 'fulfilled', 'dismissed'))
);

create unique index if not exists stock_requests_pending_uidx
  on stock_requests (customer_id, offer_variant_id)
  where status = 'pending';

create index if not exists stock_requests_variant_status_idx
  on stock_requests (offer_variant_id, status);

create index if not exists stock_requests_status_created_idx
  on stock_requests (status, created_at);
