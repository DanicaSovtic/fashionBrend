-- ============================================
-- SQL UPITI ZA DODAVANJE created_by KOLONE U collections TABELU
-- Ovaj fajl je siguran za višestruko izvršavanje
-- ============================================

-- 1. Dodaj created_by kolonu u collections tabelu ako ne postoji
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL;

-- 2. Ažuriraj postojeće kolekcije koje nemaju created_by
-- Postavi created_by na prvog modnog dizajnera iz baze (ako postoji)
UPDATE collections 
SET created_by = (
    SELECT user_id 
    FROM profiles 
    WHERE role = 'modni_dizajner' 
    LIMIT 1
)
WHERE created_by IS NULL
AND EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE role = 'modni_dizajner'
);

-- 3. INSERT primer: Dodaj novu kolekciju sa created_by modnog dizajnera
-- (Ovaj upit će raditi samo ako postoji modni dizajner u bazi)
INSERT INTO collections (
    name, 
    season, 
    status, 
    start_date, 
    end_date, 
    description, 
    collection_type, 
    outfit_style, 
    image_url,
    created_by
)
SELECT 
    'Nova Kolekcija SS26' as name,
    'SS26' as season,
    'active' as status,
    '2026-03-01'::date as start_date,
    '2026-06-30'::date as end_date,
    'Opis nove kolekcije' as description,
    'outfit' as collection_type,
    'TRENDY' as outfit_style,
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80' as image_url,
    (SELECT user_id FROM profiles WHERE role = 'modni_dizajner' LIMIT 1) as created_by
WHERE EXISTS (
    SELECT 1 FROM profiles WHERE role = 'modni_dizajner'
)
AND NOT EXISTS (
    SELECT 1 FROM collections WHERE name = 'Nova Kolekcija SS26'
);

-- 4. Provera: Prikaži sve kolekcije sa informacijama o kreatoru
SELECT 
    c.id,
    c.name,
    c.season,
    c.status,
    c.created_by,
    p.full_name as creator_name,
    p.role as creator_role
FROM collections c
LEFT JOIN profiles p ON c.created_by = p.user_id
ORDER BY c.created_at DESC;

-- 5. Provera: Da li je kolona uspešno dodata
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'collections' 
AND column_name = 'created_by';
