-- Briše zahtev(e) za materijal: Silk Drape Dress (MD-SS26-014), status Novo
-- Pokreni u Supabase SQL Editoru (redom: prvo provera, pa brisanje).

-- 1) PROVERA: pogledaj zahteve za Silk Drape Dress (trebalo bi da vidiš jedan red)
-- SELECT id, product_model_id, model_sku, material, color, quantity_kg, status
-- FROM material_requests
-- WHERE model_sku = 'MD-SS26-014' OR product_model_id = (SELECT id FROM product_models WHERE sku = 'MD-SS26-014' LIMIT 1);

-- 2) BRISANJE po model_sku
DELETE FROM material_requests
WHERE model_sku = 'MD-SS26-014'
  AND status = 'new';

-- 3) Ako i dalje ostane: obriši po product_model_id (pokreni samo ako 2 nije obrisalo)
-- DELETE FROM material_requests
-- WHERE product_model_id = (SELECT id FROM product_models WHERE sku = 'MD-SS26-014' LIMIT 1)
--   AND status = 'new';
