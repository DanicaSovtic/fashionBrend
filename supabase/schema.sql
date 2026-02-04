create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric not null,
  category text,
  image_url text,
  sastav text,
  odrzavanje text,
  poreklo text,
  created_at timestamp with time zone default now()
);

alter table products add column if not exists sastav text;
alter table products add column if not exists odrzavanje text;
alter table products add column if not exists poreklo text;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  total_price numeric not null,
  created_at timestamp with time zone default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity int not null
);
