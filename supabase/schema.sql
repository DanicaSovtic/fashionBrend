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
alter table products add column if not exists sku text;
alter table products add column if not exists product_model_id uuid references product_models(id) on delete set null;

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

-- Cart items table - directly linked to users
-- First, ensure the table exists (may have old structure)
create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid,
  product_id uuid not null references products(id) on delete restrict,
  quantity int not null default 1,
  created_at timestamp with time zone default now()
);

-- Remove NOT NULL constraint from cart_id if it exists (we don't use it anymore)
alter table cart_items alter column cart_id drop not null;

-- Add missing columns if they don't exist
alter table cart_items add column if not exists user_id uuid references profiles(user_id) on delete cascade;
alter table cart_items add column if not exists size text;
alter table cart_items add column if not exists updated_at timestamp with time zone default now();

-- Optionally drop cart_id column completely (uncomment if you want to remove it)
-- alter table cart_items drop column if exists cart_id;

-- Drop old unique index if it exists (to avoid conflicts)
drop index if exists cart_items_user_product_size_unique;

-- Create unique index to prevent duplicate cart items (treats NULL size as empty string)
-- Using a partial index that only applies when user_id is not null
create unique index if not exists cart_items_user_product_size_unique 
  on cart_items(user_id, product_id, coalesce(size, ''))
  where user_id is not null;

alter table cart_items enable row level security;

drop policy if exists "Users can view their own cart items" on cart_items;
create policy "Users can view their own cart items"
  on cart_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cart items" on cart_items;
create policy "Users can insert their own cart items"
  on cart_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cart items" on cart_items;
create policy "Users can update their own cart items"
  on cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own cart items" on cart_items;
create policy "Users can delete their own cart items"
  on cart_items for delete
  using (auth.uid() = user_id);

-- Favorites table - directly linked to users
-- First, ensure the table exists (may have old structure)
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now()
);

-- Add missing columns if they don't exist
alter table favorites add column if not exists user_id uuid references profiles(user_id) on delete cascade;
alter table favorites add column if not exists product_id uuid references products(id) on delete restrict;

-- Drop old unique constraint if it exists
alter table favorites drop constraint if exists favorites_user_id_product_id_key;
alter table favorites drop constraint if exists favorites_user_id_fkey;
alter table favorites drop constraint if exists favorites_product_id_fkey;

-- Create unique constraint to prevent duplicate favorites
-- Using a partial unique index that only applies when user_id and product_id are not null
create unique index if not exists favorites_user_product_unique 
  on favorites(user_id, product_id)
  where user_id is not null and product_id is not null;

alter table favorites enable row level security;

drop policy if exists "Users can view their own favorites" on favorites;
create policy "Users can view their own favorites"
  on favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on favorites;
create policy "Users can insert their own favorites"
  on favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on favorites;
create policy "Users can delete their own favorites"
  on favorites for delete
  using (auth.uid() = user_id);

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

create table if not exists delivery_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  issue_type text not null,
  status text not null default 'open',
  occurred_at timestamp with time zone default now(),
  note text,
  resolution_action text,
  resolved_at timestamp with time zone,
  last_updated_by text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table delivery_issues
  drop constraint if exists delivery_issues_status_check;

alter table delivery_issues
  add constraint delivery_issues_status_check check (
    status in ('open', 'in_progress', 'resolved')
  );

alter table delivery_issues
  drop constraint if exists delivery_issues_type_check;

alter table delivery_issues
  add constraint delivery_issues_type_check check (
    issue_type in (
      'customer_unavailable',
      'wrong_address',
      'package_damaged',
      'returned_shipment',
      'other'
    )
  );

create table if not exists delivery_issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references delivery_issues(id) on delete cascade,
  author text,
  body text not null,
  created_at timestamp with time zone default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text,
  status text not null default 'active',
  start_date date,
  end_date date,
  description text,
  created_at timestamp with time zone default now()
);

-- Dodaj kolone ako ne postoje
alter table collections add column if not exists collection_type text not null default 'outfit';
alter table collections add column if not exists outfit_style text;
alter table collections add column if not exists image_url text;
alter table collections add column if not exists event_date date;
alter table collections add column if not exists created_by uuid references profiles(user_id) on delete set null;

-- Drop postojeće constraint-e ako postoje (koristi DO blok za sigurno izvršavanje)
DO $$
BEGIN
  -- Drop collections_status_check ako postoji
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'collections_status_check' 
    AND conrelid = 'collections'::regclass
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_status_check;
  END IF;

  -- Drop collections_type_check ako postoji
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'collections_type_check' 
    AND conrelid = 'collections'::regclass
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_type_check;
  END IF;

  -- Drop collections_outfit_style_check ako postoji
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'collections_outfit_style_check' 
    AND conrelid = 'collections'::regclass
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_outfit_style_check;
  END IF;
END $$;

-- Kreiraj constraint-e
alter table collections
  add constraint collections_status_check check (
    status in ('planned', 'active', 'archived')
  );

alter table collections
  add constraint collections_type_check check (
    collection_type in ('outfit', 'blog')
  );

alter table collections
  add constraint collections_outfit_style_check check (
    outfit_style is null or outfit_style in ('TRENDY', 'VIRAL', 'TAILORING', 'CASUAL')
  );

-- Napomena: Proizvodi se povezuju sa kolekcijama kroz product_models.collection_id
-- Ne koristimo collection_products tabelu jer modni dizajner radi sa product_models

create table if not exists product_models (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete set null,
  name text not null,
  sku text,
  category text,
  development_stage text not null default 'idea',
  concept text,
  inspiration text,
  color_palette text,
  variants text,
  pattern_notes text,
  materials text,
  size_table text,
  tech_notes text,
  price numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table product_models
  drop constraint if exists product_models_stage_check;

alter table product_models
  add constraint product_models_stage_check check (
    development_stage in ('idea', 'prototype', 'testing', 'approved')
  );

create table if not exists product_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references product_models(id) on delete cascade,
  version_number int not null,
  change_summary text,
  payload jsonb,
  created_at timestamp with time zone default now(),
  created_by uuid references profiles(user_id) on delete set null
);

create table if not exists product_model_comments (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references product_models(id) on delete cascade,
  author_id uuid references profiles(user_id) on delete set null,
  author_name text,
  role text,
  body text not null,
  created_at timestamp with time zone default now()
);

create table if not exists product_model_approvals (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references product_models(id) on delete cascade,
  approval_item text not null,
  status text not null default 'pending',
  note text,
  approved_by uuid references profiles(user_id) on delete set null,
  updated_at timestamp with time zone default now()
);

alter table product_model_approvals
  drop constraint if exists product_model_approvals_status_check;

alter table product_model_approvals
  add constraint product_model_approvals_status_check check (
    status in ('pending', 'in_progress', 'approved', 'changes_required')
  );

create table if not exists product_model_media (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references product_models(id) on delete cascade,
  image_url text not null,
  label text,
  is_primary boolean default false,
  created_at timestamp with time zone default now()
);

-- Sample inserts for designer workflow (collections + product models)
-- Napomena: created_by će biti automatski postavljen kada modni dizajner kreira kolekciju kroz aplikaciju
-- Za testiranje, možete ručno postaviti created_by na user_id modnog dizajnera
insert into collections (id, name, season, status, start_date, end_date, description, collection_type, outfit_style, image_url, created_by)
values
  ('11111111-1111-1111-1111-111111111111', 'Aurora SS26', 'SS26', 'active', '2026-03-01', '2026-06-30',
   'Lagane siluete inspirisane jutarnjim svetlom i refleksijama.', 'outfit', null,
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', null),
  ('22222222-2222-2222-2222-222222222222', 'Noir Atelier FW26', 'FW26', 'planned', '2026-08-01', '2026-11-30',
   'Struktura i tekstura u tamnijoj paleti za gradsku eleganciju.', 'outfit', null,
   'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80', null),
  ('33333333-3333-3333-3333-333333333333', 'Essenza Resort 25', 'Resort 25', 'archived', '2025-01-01', '2025-04-30',
   'Arhivirana kolekcija sa fokusom na resort komade.', 'outfit', null,
   'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', null)
on conflict (id) do nothing;

-- Outfit kolekcije (TRENDY, VIRAL, TAILORING)
insert into collections (id, name, season, status, start_date, end_date, description, collection_type, outfit_style, image_url, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trendy Collection', 'SS26', 'active', '2026-03-01', '2026-06-30',
   'Moderne i trendovske kombinacije za svakodnevni stil.', 'outfit', 'TRENDY',
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Viral Collection', 'SS26', 'active', '2026-03-01', '2026-06-30',
   'Viralni komadi koji su osvojili društvene mreže.', 'outfit', 'VIRAL',
   'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80', null),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tailoring Collection', 'SS26', 'active', '2026-03-01', '2026-06-30',
   'Precizni krojevi i struktura za sofisticiran izgled.', 'outfit', 'TAILORING',
   'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', null)
on conflict (id) do nothing;

-- Blog kolekcije (o popularnim događajima)
insert into collections (id, name, season, status, start_date, end_date, description, collection_type, event_date, image_url, created_by)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Belgrade Fashion Week 2026', 'FW26', 'active', '2026-09-15', '2026-09-20',
   'Posebna kolekcija inspirisana najvećim modnim događajem u regionu.', 'blog', '2026-09-15',
   'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80', null),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Milan Fashion Week Highlights', 'SS27', 'planned', '2027-02-20', '2027-02-27',
   'Najbolji trenutci iz Milana - trendovi koji će oblikovati sezonu.', 'blog', '2027-02-20',
   'https://images.unsplash.com/photo-1469334031218-e382a71b716b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', null),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Paris Couture Week 2026', 'FW26', 'active', '2026-07-01', '2026-07-07',
   'Ekskluzivni pregled haute couture kolekcija iz Pariza.', 'blog', '2026-07-01',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80', null)
on conflict (id) do nothing;

insert into product_models (
  id, collection_id, name, sku, category, development_stage,
  concept, inspiration, color_palette, variants, pattern_notes, materials, size_table, tech_notes
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Silk Drape Dress',
    'MD-SS26-014',
    'Haljine',
    'prototype',
    'Fluidna silueta inspirisana pokretom svetlosti.',
    'Skandinavska arhitektura, minimalizam.',
    'pearl, misty rose, soft lilac',
    'Midi; Maxi; Sleeveless',
    'Asimetricno drapiranje sa skrivenim savovima.',
    'Svila 22 momme; Viskoza postava; Metalne kopce',
    'XS-XL standard, korekcije duzine +2cm',
    'Ojcanje ramena, skriveni zip na levom boku.'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Structured Linen Blazer',
    'MD-SS26-021',
    'Sakoi',
    'testing',
    'Balans izmedju kroja i lezerne siluete.',
    'Vintage tailoring, city garden.',
    'sand, olive, chalk',
    'Cropped; Regular',
    'Dvostruko postavljen rever, rucno oblikovan.',
    'Lan 280g; Pamuk podstava',
    'S-XXL, korekcije u ramenima',
    'Testirati dugmad i opterecenje na sramenima.'
  )
on conflict (id) do nothing;

insert into product_model_versions (id, model_id, version_number, change_summary, payload)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1,
   'Pocetni koncept i izbor materijala',
   '{"palette":["pearl","misty rose","soft lilac"],"materials":["Svila 22 momme","Viskoza postava"]}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1,
   'Dodate varijante i korekcije kroja',
   '{"variants":["Cropped","Regular"],"pattern":"Dvostruko postavljen rever"}')
on conflict (id) do nothing;

insert into product_model_comments (id, model_id, author_name, role, body)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Mila Petrovic', 'proizvodjac',
   'Predlog: ojacati savove na ramenom delu zbog tezine materijala.'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Nikola Ilic', 'tester_kvaliteta',
   'Fit test pokazuje potrebu za +1cm u struku za velicinu M.')
on conflict (id) do nothing;

insert into product_model_approvals (id, model_id, approval_item, status, note)
values
  ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Materijali', 'in_progress', 'Ceka se potvrda dobavljaca.'),
  ('88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Krojevi', 'approved', 'Odobreno nakon druge probe.'),
  ('77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Fit test', 'changes_required', 'Potrebne korekcije u struku.')
on conflict (id) do nothing;

insert into product_model_media (id, model_id, image_url, label, is_primary)
values
  ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=800&q=80',
   'Lookbook', true)
on conflict (id) do nothing;
