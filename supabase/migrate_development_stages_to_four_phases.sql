-- ============================================================
-- Migracija faza razvoja modela: Prototip → Razvoj (development)
-- ============================================================
-- Faze razvoja proizvoda su sada samo ove četiri:
--   1. Ideja (idea)
--   2. Razvoj (development)   -- ranije: Prototip (prototype)
--   3. Testiranje (testing)
--   4. Odobreno (approved)
-- Pokrenuti u Supabase SQL Editoru ili: supabase db execute -f supabase/migrate_development_stages_to_four_phases.sql

-- 1. Ažuriraj postojeće zapise: svi sa 'prototype' postaju 'development'
UPDATE product_models
SET development_stage = 'development',
    updated_at = now()
WHERE development_stage = 'prototype';

-- 2. Ukloni stari constraint
ALTER TABLE product_models
  DROP CONSTRAINT IF EXISTS product_models_stage_check;

-- 3. Dodaj novi constraint sa dozvoljenim fazama: idea, development, testing, approved
ALTER TABLE product_models
  ADD CONSTRAINT product_models_stage_check CHECK (
    development_stage IN ('idea', 'development', 'testing', 'approved')
  );
