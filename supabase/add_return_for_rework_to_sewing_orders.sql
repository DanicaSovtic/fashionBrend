-- Dodaje kolone za razlog vraćanja naloga na doradu (kada dizajner klikne "Vrati na doradu")
-- Pokreni u Supabase SQL Editoru

ALTER TABLE sewing_orders
  ADD COLUMN IF NOT EXISTS return_for_rework_reason text,
  ADD COLUMN IF NOT EXISTS return_for_rework_at timestamp with time zone;

COMMENT ON COLUMN sewing_orders.return_for_rework_reason IS 'Razlog koji je dizajner uneo pri vraćanju proizvoda na doradu';
COMMENT ON COLUMN sewing_orders.return_for_rework_at IS 'Kada je dizajner vratio nalog na doradu';
