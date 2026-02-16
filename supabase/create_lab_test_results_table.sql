-- Kreiranje tabele za čuvanje rezultata testova laboratorije
-- Pokrenuti u Supabase SQL Editor

create table if not exists lab_test_results (
  id uuid primary key default gen_random_uuid(),
  product_model_id uuid not null references product_models(id) on delete cascade,
  material_name text not null,
  percentage integer not null check (percentage >= 0 and percentage <= 100),
  certificate_hash text,
  notes text,
  tested_by uuid references profiles(user_id) on delete set null,
  lab_name text,
  created_at timestamp with time zone default now()
);

-- Indeks za brže pretraživanje po proizvodu
create index if not exists idx_lab_test_results_product_model 
  on lab_test_results(product_model_id);

-- Indeks za brže pretraživanje po laborantu
create index if not exists idx_lab_test_results_tested_by 
  on lab_test_results(tested_by);

-- Indeks za brže pretraživanje po materijalu
create index if not exists idx_lab_test_results_material 
  on lab_test_results(material_name);

-- RLS politika - svi autentifikovani korisnici mogu da vide rezultate
alter table lab_test_results enable row level security;

drop policy if exists "Anyone authenticated can view lab test results" on lab_test_results;
create policy "Anyone authenticated can view lab test results"
  on lab_test_results for select
  using (auth.role() = 'authenticated');

-- Samo laborant može da dodaje rezultate
drop policy if exists "Only laborant can insert lab test results" on lab_test_results;
create policy "Only laborant can insert lab test results"
  on lab_test_results for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'laborant'
    )
  );

-- Provera da li tabela postoji
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'lab_test_results'
ORDER BY ordinal_position;
