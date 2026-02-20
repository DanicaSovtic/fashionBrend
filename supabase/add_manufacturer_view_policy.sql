-- SQL migracija za dozvolu dobavljaču da vidi profile proizvođača
-- Dodaje RLS policy koja dozvoljava dobavljaču materijala da vidi profile proizvođača

-- Proveri da li profiles tabela ima RLS enabled
alter table profiles enable row level security;

-- Dodaj policy koja dozvoljava dobavljaču materijala da vidi profile proizvođača
drop policy if exists "Suppliers can view manufacturer profiles" on profiles;
create policy "Suppliers can view manufacturer profiles"
  on profiles for select
  using (
    -- Dobavljač može da vidi profile proizvođača
    (
      exists (
        select 1 from profiles p
        where p.user_id = auth.uid()
        and p.role = 'dobavljac_materijala'
      )
      and role = 'proizvodjac'
    )
    -- Superadmin vidi sve
    or exists (
      select 1 from profiles p
      where p.user_id = auth.uid()
      and p.role = 'superadmin'
    )
    -- Svako može da vidi svoj profil
    or auth.uid() = user_id
  );

-- Takođe, dodaj policy za dizajnera da vidi profile dobavljača i proizvođača
drop policy if exists "Designers can view supplier and manufacturer profiles" on profiles;
create policy "Designers can view supplier and manufacturer profiles"
  on profiles for select
  using (
    -- Dizajner može da vidi profile dobavljača i proizvođača
    (
      exists (
        select 1 from profiles p
        where p.user_id = auth.uid()
        and p.role = 'modni_dizajner'
      )
      and role in ('dobavljac_materijala', 'proizvodjac')
    )
    -- Superadmin vidi sve
    or exists (
      select 1 from profiles p
      where p.user_id = auth.uid()
      and p.role = 'superadmin'
    )
    -- Svako može da vidi svoj profil
    or auth.uid() = user_id
  );
