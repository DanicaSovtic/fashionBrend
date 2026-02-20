-- Tabele za dobavljača materijala
-- Kreira: material_requests, inventory_items, request_messages

-- 1. Tabela za zalihe dobavljača (inventory_items)
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references profiles(user_id) on delete cascade,
  material text not null,
  color text not null,
  quantity_kg numeric not null default 0,
  price_per_kg numeric,
  lead_time_days integer,
  status text not null default 'active',
  blockchain_item_id text, -- ID stavke na blockchainu (ako se koristi)
  blockchain_tx_hash text, -- Hash transakcije za dodavanje/izmenu
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table inventory_items
  add constraint inventory_items_status_check check (
    status in ('active', 'paused')
  );

create index if not exists idx_inventory_items_supplier on inventory_items(supplier_id);
create index if not exists idx_inventory_items_material_color on inventory_items(material, color);
create index if not exists idx_inventory_items_status on inventory_items(status);

-- 2. Tabela za zahteve materijala od dizajnera (material_requests)
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
  quantity_sent_kg numeric, -- Količina koju dobavljač šalje
  batch_lot_id text,
  document_url text, -- URL sertifikata/specifikacije
  shipping_date date,
  tracking_number text,
  manufacturer_address text,
  notes text, -- Napomena dizajnera
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table material_requests
  add constraint material_requests_status_check check (
    status in ('new', 'in_progress', 'sent', 'completed', 'rejected')
  );

create index if not exists idx_material_requests_supplier on material_requests(supplier_id);
create index if not exists idx_material_requests_requested_by on material_requests(requested_by);
create index if not exists idx_material_requests_status on material_requests(status);
create index if not exists idx_material_requests_product_model on material_requests(product_model_id);

-- 3. Tabela za poruke/komunikaciju oko zahteva (request_messages)
create table if not exists request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references material_requests(id) on delete cascade,
  author_id uuid not null references profiles(user_id) on delete restrict,
  author_name text,
  author_role text,
  body text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_request_messages_request on request_messages(request_id);
create index if not exists idx_request_messages_author on request_messages(author_id);

-- RLS policies za inventory_items
alter table inventory_items enable row level security;

drop policy if exists "Suppliers can view their own inventory" on inventory_items;
create policy "Suppliers can view their own inventory"
  on inventory_items for select
  using (auth.uid() = supplier_id);

drop policy if exists "Suppliers can insert their own inventory" on inventory_items;
create policy "Suppliers can insert their own inventory"
  on inventory_items for insert
  with check (auth.uid() = supplier_id);

drop policy if exists "Suppliers can update their own inventory" on inventory_items;
create policy "Suppliers can update their own inventory"
  on inventory_items for update
  using (auth.uid() = supplier_id)
  with check (auth.uid() = supplier_id);

drop policy if exists "Suppliers can delete their own inventory" on inventory_items;
create policy "Suppliers can delete their own inventory"
  on inventory_items for delete
  using (auth.uid() = supplier_id);

-- RLS policies za material_requests
alter table material_requests enable row level security;

drop policy if exists "Designers can view their requests" on material_requests;
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

drop policy if exists "Designers can create requests" on material_requests;
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

drop policy if exists "Suppliers can update assigned requests" on material_requests;
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

-- RLS policies za request_messages
alter table request_messages enable row level security;

drop policy if exists "Users can view messages for their requests" on request_messages;
create policy "Users can view messages for their requests"
  on request_messages for select
  using (
    exists (
      select 1 from material_requests mr
      where mr.id = request_messages.request_id
      and (
        mr.requested_by = auth.uid()
        or mr.supplier_id = auth.uid()
        or exists (
          select 1 from profiles 
          where user_id = auth.uid() 
          and role = 'superadmin'
        )
      )
    )
  );

drop policy if exists "Users can create messages for their requests" on request_messages;
create policy "Users can create messages for their requests"
  on request_messages for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from material_requests mr
      where mr.id = request_messages.request_id
      and (
        mr.requested_by = auth.uid()
        or mr.supplier_id = auth.uid()
        or exists (
          select 1 from profiles 
          where user_id = auth.uid() 
          and role = 'superadmin'
        )
      )
    )
  );
