-- ============================================
-- SQL UPITI ZA ISPRAVKU RLS POLITIKA
-- Problem: RLS politike ne dozvoljavaju INSERT operacije
-- ============================================

-- 1. OBRISI POSTOJEĆE POLITIKE ZA cart_items
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;

-- 2. KREIRAJ NOVE POLITIKE ZA cart_items
-- SELECT - korisnici mogu da vide samo svoje stavke
CREATE POLICY "Users can view their own cart items"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT - korisnici mogu da dodaju samo svoje stavke
-- Važno: user_id mora biti jednak auth.uid()
-- (Provera uloge se radi u backend middleware-u)
CREATE POLICY "Users can insert their own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE - korisnici mogu da ažuriraju samo svoje stavke
CREATE POLICY "Users can update their own cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE - korisnici mogu da brišu samo svoje stavke
CREATE POLICY "Users can delete their own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- 3. OBRISI POSTOJEĆE POLITIKE ZA favorites
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON favorites;

-- 4. KREIRAJ NOVE POLITIKE ZA favorites
-- SELECT - korisnici mogu da vide samo svoje omiljene proizvode
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT - korisnici mogu da dodaju samo svoje omiljene proizvode
-- Važno: user_id mora biti jednak auth.uid()
-- (Provera uloge se radi u backend middleware-u)
CREATE POLICY "Users can insert their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE - korisnici mogu da brišu samo svoje omiljene proizvode
CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 5. RLS POLITIKE ZA collections
alter table collections enable row level security;

drop policy if exists "Collections are viewable by everyone" on collections;
create policy "Collections are viewable by everyone"
  on collections for select
  using (true);

drop policy if exists "Collections can be managed by admins and designers" on collections;
create policy "Collections can be managed by admins and designers"
  on collections for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('superadmin', 'modni_dizajner')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('superadmin', 'modni_dizajner')
    )
  );

-- 6. RLS POLITIKE ZA product_models
alter table product_models enable row level security;

drop policy if exists "Product models are viewable by everyone" on product_models;
create policy "Product models are viewable by everyone"
  on product_models for select
  using (true);

drop policy if exists "Product models can be managed by admins and designers" on product_models;
create policy "Product models can be managed by admins and designers"
  on product_models for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('superadmin', 'modni_dizajner')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('superadmin', 'modni_dizajner')
    )
  );

-- 7. RLS POLITIKE ZA product_model_media
alter table product_model_media enable row level security;

drop policy if exists "Product model media are viewable by everyone" on product_model_media;
create policy "Product model media are viewable by everyone"
  on product_model_media for select
  using (true);

drop policy if exists "Product model media can be managed by admins and designers" on product_model_media;
create policy "Product model media can be managed by admins and designers"
  on product_model_media for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('superadmin', 'modni_dizajner')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role in ('superadmin', 'modni_dizajner')
    )
  );

-- 8. PROVERA - Da li su politike kreirane
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('cart_items', 'favorites', 'collections', 'product_models', 'product_model_media')
ORDER BY tablename, policyname;
