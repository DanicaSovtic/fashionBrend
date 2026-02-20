-- SQL migracija za funkcionalnost "RAZVOJ MODELA" za modnog dizajnera
-- Dodaje podršku za slanje zahteva dobavljaču materijala

-- 1. Proveri da li tabela material_requests već postoji (kreirana u create_supplier_tables.sql)
-- Ako ne postoji, kreiraj je
create table if not exists material_requests (
  id uuid primary key default gen_random_uuid(),
  product_model_id uuid references product_models(id) on delete set null,
  collection_id uuid references collections(id) on delete set null,
  requested_by uuid not null references profiles(user_id) on delete restrict,
  supplier_id uuid references profiles(user_id) on delete restrict,
  model_name text,
  model_sku text,
  material text not null,
  color text not null,
  quantity_kg numeric not null,
  deadline date,
  status text not null default 'new',
  rejection_reason text,
  quantity_sent_kg numeric,
  batch_lot_id text,
  document_url text,
  shipping_date date,
  tracking_number text,
  manufacturer_address text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Dodaj constraint za status ako ne postoji
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'material_requests_status_check'
  ) then
    alter table material_requests
      add constraint material_requests_status_check check (
        status in ('new', 'in_progress', 'sent', 'completed', 'rejected')
      );
  end if;
end $$;

-- 2. Kreiraj VIEW za status materijala po modelu
-- Ovaj view agregira status zahteva za svaki model i vraća najnoviji status
create or replace view model_material_status as
select distinct on (product_model_id)
  product_model_id,
  case
    when count(*) filter (where status = 'completed') > 0 then 'completed'
    when count(*) filter (where status = 'sent') > 0 then 'sent'
    when count(*) filter (where status = 'in_progress') > 0 then 'in_progress'
    when count(*) filter (where status = 'rejected') > 0 then 'rejected'
    when count(*) filter (where status = 'new') > 0 then 'new'
    else 'no_request'
  end as material_status,
  max(created_at) as last_request_date,
  count(*) as total_requests
from material_requests
where product_model_id is not null
group by product_model_id;

-- 3. Kreiraj funkciju za dobijanje statusa materijala za model
-- Vraća najnoviji status ili 'no_request' ako nema zahteva
create or replace function get_model_material_status(model_id uuid)
returns text as $$
declare
  status_result text;
begin
  select coalesce(
    (select material_status from model_material_status where product_model_id = model_id),
    'no_request'
  ) into status_result;
  
  return status_result;
end;
$$ language plpgsql;

-- 4. Dodaj indexe za bolje performanse (ako već ne postoje)
create index if not exists idx_material_requests_product_model on material_requests(product_model_id);
create index if not exists idx_material_requests_requested_by on material_requests(requested_by);
create index if not exists idx_material_requests_supplier on material_requests(supplier_id);
create index if not exists idx_material_requests_status on material_requests(status);
create index if not exists idx_material_requests_created_at on material_requests(created_at desc);

-- 5. Dodaj RLS policies ako već ne postoje (za slučaj da tabela već postoji)
alter table material_requests enable row level security;

-- Policy za SELECT - dizajner vidi svoje zahteve, dobavljač vidi dodeljene sebi
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'material_requests' 
    and policyname = 'Designers can view their requests'
  ) then
    create policy "Designers can view their requests"
      on material_requests for select
      using (
        auth.uid() = requested_by 
        or auth.uid() = supplier_id
        or exists (
          select 1 from profiles 
          where user_id = auth.uid() 
          and role in ('superadmin', 'modni_dizajner')
        )
      );
  end if;
end $$;

-- Policy za INSERT - dizajner može kreirati zahteve
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'material_requests' 
    and policyname = 'Designers can create requests'
  ) then
    create policy "Designers can create requests"
      on material_requests for insert
      with check (
        auth.uid() = requested_by
        or exists (
          select 1 from profiles 
          where user_id = auth.uid() 
          and role = 'superadmin'
        )
      );
  end if;
end $$;

-- Policy za UPDATE - dobavljač i dizajner mogu ažurirati
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'material_requests' 
    and policyname = 'Suppliers can update assigned requests'
  ) then
    create policy "Suppliers can update assigned requests"
      on material_requests for update
      using (
        auth.uid() = supplier_id
        or auth.uid() = requested_by
        or exists (
          select 1 from profiles 
          where user_id = auth.uid() 
          and role = 'superadmin'
        )
      )
      with check (
        auth.uid() = supplier_id
        or auth.uid() = requested_by
        or exists (
          select 1 from profiles 
          where user_id = auth.uid() 
          and role = 'superadmin'
        )
      );
  end if;
end $$;

-- 6. Komentar za dokumentaciju
comment on view model_material_status is 'Pregled statusa materijala za svaki model proizvoda';
comment on function get_model_material_status(uuid) is 'Vraća status materijala za dati model (no_request, new, in_progress, sent, completed, rejected)';
