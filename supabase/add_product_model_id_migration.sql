-- Migracija: Dodavanje kolone product_model_id u products tabelu
-- Ovaj upit je siguran za pokretanje više puta (idempotent)

-- Dodaj kolonu product_model_id ako ne postoji
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_model_id uuid REFERENCES product_models(id) ON DELETE SET NULL;

-- Dodaj kolonu sku ako ne postoji (takođe je potrebna)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku text;

-- Dodaj kolonu price u product_models ako ne postoji
ALTER TABLE product_models 
ADD COLUMN IF NOT EXISTS price numeric;

-- Provera: Prikaži strukturu products tabele
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
    AND column_name IN ('product_model_id', 'sku')
ORDER BY column_name;

-- Provera: Prikaži strukturu product_models tabele za price kolonu
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'product_models' 
    AND column_name = 'price';

-- Provera: Prikaži sve odobrene modele koji još nisu kreirani kao proizvodi
SELECT 
    pm.id as model_id,
    pm.name,
    pm.category,
    pm.development_stage,
    pm.price,
    p.id as product_id,
    p.title as product_title
FROM product_models pm
LEFT JOIN products p ON p.product_model_id = pm.id
WHERE pm.development_stage = 'approved'
ORDER BY pm.created_at DESC;
