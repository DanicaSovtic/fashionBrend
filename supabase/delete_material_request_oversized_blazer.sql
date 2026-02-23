-- Briše zahtev za materijal: Oversized Blazer (MD-SS26-502), Pamuk/Crna/10 kg, bez dodeljenog dobavljača, status Novo
-- Pokreni u Supabase SQL Editoru

DELETE FROM material_requests
WHERE model_sku = 'MD-SS26-502'
  AND material = 'Pamuk'
  AND color = 'Crna'
  AND quantity_kg = 10
  AND supplier_id IS NULL
  AND status = 'new';
