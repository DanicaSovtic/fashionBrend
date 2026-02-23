-- Uklanja kolonu "Rok isporuke (dana)" iz zaliha dobavljača (inventory_items)
-- Pokreni u Supabase SQL Editoru

ALTER TABLE inventory_items
  DROP COLUMN IF EXISTS lead_time_days;
