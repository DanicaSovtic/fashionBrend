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

alter table orders add column if not exists status text default 'ready_for_shipping';
alter table orders add column if not exists recipient_name text;
alter table orders add column if not exists recipient_city text;
alter table orders add column if not exists recipient_postal_code text;
alter table orders add column if not exists recipient_country text;
alter table orders add column if not exists recipient_phone text;
alter table orders add column if not exists courier_name text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists planned_delivery timestamp with time zone;
alter table orders add column if not exists last_status_at timestamp with time zone;
alter table orders add column if not exists last_status_by text;
alter table orders add column if not exists last_status_note text;

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity int not null
);

alter table order_items add column if not exists product_sku text;
alter table order_items add column if not exists product_name text;
alter table order_items add column if not exists size text;
alter table order_items add column if not exists color text;

create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  occurred_at timestamp with time zone default now(),
  actor text,
  note text
);

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  reason text,
  status text not null,
  received_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity int not null,
  created_at timestamp with time zone default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now()
);

create table if not exists favorite_items (
  id uuid primary key default gen_random_uuid(),
  favorite_id uuid not null references favorites(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  created_at timestamp with time zone default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null,
  created_at timestamp with time zone default now()
);

alter table profiles
  drop constraint if exists profiles_role_check;

alter table profiles
  add constraint profiles_role_check check (
    role in (
      'superadmin',
      'modni_dizajner',
      'dobavljac',
      'proizvodjac',
      'tester_kvaliteta',
      'distributer',
      'krajnji_korisnik'
    )
  );

alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on profiles;
create policy "Profiles are viewable by owner"
  on profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Profiles can be inserted by owner" on profiles;
create policy "Profiles can be inserted by owner"
  on profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Profiles can be updated by owner without role change" on profiles;
create policy "Profiles can be updated by owner without role change"
  on profiles for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and role = (select p.role from profiles p where p.user_id = auth.uid())
  );
