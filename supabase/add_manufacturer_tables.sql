-- SQL migracija za funkcionalnost proizvođača
-- Dodaje tabele za slanje materijala proizvođaču i naloge za šivenje

-- 1. Tabela za pošiljke materijala od dobavljača ka proizvođaču
create table if not exists material_shipments (
  id uuid primary key default gen_random_uuid(),
  material_request_id uuid not null references material_requests(id) on delete restrict,
  product_model_id uuid references product_models(id) on delete set null,
  collection_id uuid references collections(id) on delete set null,
  supplier_id uuid not null references profiles(user_id) on delete restrict,
  manufacturer_id uuid not null references profiles(user_id) on delete restrict,
  model_name text,
  model_sku text,
  material text not null,
  color text not null,
  quantity_kg numeric not null,
  quantity_sent_kg numeric not null, -- Količina koju dobavljač šalje
  shipping_date date,
  tracking_number text,
  status text not null default 'sent_to_manufacturer',
  received_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  problem_reported boolean default false,
  problem_reason text,
  problem_comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table material_shipments
  add constraint material_shipments_status_check check (
    status in ('sent_to_manufacturer', 'received', 'confirmed', 'problem_reported')
  );

create index if not exists idx_material_shipments_manufacturer on material_shipments(manufacturer_id);
create index if not exists idx_material_shipments_supplier on material_shipments(supplier_id);
create index if not exists idx_material_shipments_status on material_shipments(status);
create index if not exists idx_material_shipments_product_model on material_shipments(product_model_id);
create index if not exists idx_material_shipments_material_request on material_shipments(material_request_id);

-- 2. Tabela za naloge za šivenje
create table if not exists sewing_orders (
  id uuid primary key default gen_random_uuid(),
  product_model_id uuid not null references product_models(id) on delete restrict,
  collection_id uuid references collections(id) on delete set null,
  manufacturer_id uuid not null references profiles(user_id) on delete restrict,
  model_name text not null,
  model_sku text,
  quantity_pieces integer not null, -- Broj komada za izradu
  deadline date,
  status text not null default 'new',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  proof_document_url text, -- URL slike pakovanja ili dokumenta
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table sewing_orders
  add constraint sewing_orders_status_check check (
    status in ('new', 'in_progress', 'completed')
  );

create index if not exists idx_sewing_orders_manufacturer on sewing_orders(manufacturer_id);
create index if not exists idx_sewing_orders_status on sewing_orders(status);
create index if not exists idx_sewing_orders_product_model on sewing_orders(product_model_id);
create index if not exists idx_sewing_orders_collection on sewing_orders(collection_id);

-- 3. Tabela za poruke oko pošiljki materijala (proširenje request_messages)
-- Koristimo postojeću request_messages tabelu, ali dodajemo vezu sa material_shipments
alter table request_messages add column if not exists shipment_id uuid references material_shipments(id) on delete set null;

create index if not exists idx_request_messages_shipment on request_messages(shipment_id);

-- 4. RLS policies za material_shipments
alter table material_shipments enable row level security;

drop policy if exists "Manufacturers can view their shipments" on material_shipments;
create policy "Manufacturers can view their shipments"
  on material_shipments for select
  using (
    auth.uid() = manufacturer_id
    or auth.uid() = supplier_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role in ('superadmin', 'modni_dizajner')
    )
  );

drop policy if exists "Suppliers can create shipments" on material_shipments;
create policy "Suppliers can create shipments"
  on material_shipments for insert
  with check (
    auth.uid() = supplier_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role = 'superadmin'
    )
  );

drop policy if exists "Manufacturers can update their shipments" on material_shipments;
create policy "Manufacturers can update their shipments"
  on material_shipments for update
  using (
    auth.uid() = manufacturer_id
    or auth.uid() = supplier_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role = 'superadmin'
    )
  )
  with check (
    auth.uid() = manufacturer_id
    or auth.uid() = supplier_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role = 'superadmin'
    )
  );

-- 5. RLS policies za sewing_orders
alter table sewing_orders enable row level security;

drop policy if exists "Manufacturers can view their orders" on sewing_orders;
create policy "Manufacturers can view their orders"
  on sewing_orders for select
  using (
    auth.uid() = manufacturer_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role in ('superadmin', 'modni_dizajner')
    )
  );

drop policy if exists "Designers can create sewing orders" on sewing_orders;
create policy "Designers can create sewing orders"
  on sewing_orders for insert
  with check (
    exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role in ('superadmin', 'modni_dizajner')
    )
  );

drop policy if exists "Manufacturers can update their orders" on sewing_orders;
create policy "Manufacturers can update their orders"
  on sewing_orders for update
  using (
    auth.uid() = manufacturer_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role = 'superadmin'
    )
  )
  with check (
    auth.uid() = manufacturer_id
    or exists (
      select 1 from profiles 
      where user_id = auth.uid() 
      and role = 'superadmin'
    )
  );

-- 6. VIEW za statistiku proizvođača
create or replace view manufacturer_dashboard_stats as
select 
  manufacturer_id,
  count(*) filter (where status = 'sent_to_manufacturer') as pending_shipments,
  count(*) filter (where status = 'received') as received_shipments,
  count(*) filter (where status = 'confirmed') as confirmed_shipments,
  count(*) filter (where problem_reported = true) as problem_shipments
from material_shipments
group by manufacturer_id;

-- 7. VIEW za statistiku naloga za šivenje
create or replace view sewing_orders_stats as
select 
  manufacturer_id,
  count(*) filter (where status = 'new') as new_orders,
  count(*) filter (where status = 'in_progress') as in_progress_orders,
  count(*) filter (where status = 'completed') as completed_orders
from sewing_orders
group by manufacturer_id;

-- 8. Komentari za dokumentaciju
comment on table material_shipments is 'Pošiljke materijala od dobavljača ka proizvođaču';
comment on table sewing_orders is 'Nalozi za šivenje koje proizvođač dobija';
comment on view manufacturer_dashboard_stats is 'Statistika pošiljki materijala po proizvođaču';
comment on view sewing_orders_stats is 'Statistika naloga za šivenje po proizvođaču';
