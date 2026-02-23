-- Za TESTIRANJE: Odveži Oversized Blazer (MD-SS26-502) od prodaje i postavi fazu na Razvoj
-- da u "Pristigli proizvodi" dizajner vidi dugmad "Vrati na doradu" i "Pusti na testiranje"
-- Pokreni u Supabase SQL Editoru SAMO ako želiš da testiraš ta dugmad na ovom modelu.

-- 1. Odveži products zapis od modela (proizvod više nije "u prodaji" za ovaj model)
UPDATE products
SET product_model_id = NULL
WHERE product_model_id = (SELECT id FROM product_models WHERE sku = 'MD-SS26-502' LIMIT 1);

-- 2. Postavi fazu modela na Razvoj (kao da je stigao od proizvođača, čeka odluku dizajnera)
UPDATE product_models
SET development_stage = 'development',
    updated_at = now()
WHERE sku = 'MD-SS26-502';
