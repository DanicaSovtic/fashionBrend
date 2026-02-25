-- Tabele za pregled životnog ciklusa i digitalni identitet proizvoda
-- Korak 1: Dogadaji životnog ciklusa po modelu (model → proizvodi dele isti put)

create table if not exists product_model_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  product_model_id uuid not null references product_models(id) on delete cascade,
  step_key text not null,
  step_label_sr text not null,
  occurred_at timestamp with time zone not null,
  description text,
  blockchain_tx_hash text,
  blockchain_record_id text,
  sort_order int not null default 0,
  created_at timestamp with time zone default now()
);

comment on table product_model_lifecycle_events is 'Koraci životnog ciklusa modela (ideja → materijal → proizvodnja → QC → pakovanje → u prodaji); prikazuju se na stranici proizvoda.';
comment on column product_model_lifecycle_events.step_key is 'Jedinstveni ključ faze: idea, development, material_confirmed, production_started, production_completed, quality_control, packaged, added_to_shop';
comment on column product_model_lifecycle_events.blockchain_tx_hash is 'Hash transakcije na blockchainu kao dokaz nepromenjenosti.';
comment on column product_model_lifecycle_events.blockchain_record_id is 'ID zapisa na blockchainu za verifikaciju.';

create index if not exists idx_lifecycle_events_product_model
  on product_model_lifecycle_events(product_model_id);
create index if not exists idx_lifecycle_events_occurred_at
  on product_model_lifecycle_events(occurred_at);

alter table product_model_lifecycle_events enable row level security;

drop policy if exists "Lifecycle events are viewable by everyone" on product_model_lifecycle_events;
create policy "Lifecycle events are viewable by everyone"
  on product_model_lifecycle_events for select
  using (true);

-- Samo admin/dizajner mogu da upisuju (za produkciju bi se događaji pisali iz sistema)
drop policy if exists "Admins and designers can manage lifecycle events" on product_model_lifecycle_events;
create policy "Admins and designers can manage lifecycle events"
  on product_model_lifecycle_events for all
  using (
    exists (
      select 1 from profiles
      where user_id = auth.uid()
      and role in ('superadmin', 'modni_dizajner')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where user_id = auth.uid()
      and role in ('superadmin', 'modni_dizajner')
    )
  );

-- Kolone na products za digitalni identitet (opciono po proizvodu)
alter table products add column if not exists digital_id text;
alter table products add column if not exists authenticity_status text default 'verified';

comment on column products.digital_id is 'Jedinstveni digitalni ID proizvoda (npr. za skeniranje ili blockchain).';
comment on column products.authenticity_status is 'verified | pending | unavailable';
