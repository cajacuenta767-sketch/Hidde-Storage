create table if not exists promotions (
  id bigint generated always as identity primary key,
  kind text not null,
  title text not null,
  subtitle text,
  cta_label text,
  product_id bigint references products(id) on delete set null,
  market_code text references markets(code) on delete restrict,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_kind_check
    check (kind in ('banner', 'announcement'))
);

create index if not exists promotions_kind_active_idx
  on promotions (kind, is_active, sort_order);
