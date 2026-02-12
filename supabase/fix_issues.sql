-- ============================================
-- SQL UPITI ZA ISPRAVKU PROBLEMA
-- Pokreni ove upite u Supabase SQL Editor-u
-- ============================================

-- 1. UKLJUČI RLS ZA cart_items (ako nije već uključen)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 2. OBRISI size KOLONU IZ favorites TABELE (ako postoji)
-- favorites tabela ne treba da ima size kolonu - to je samo za cart_items
ALTER TABLE favorites DROP COLUMN IF EXISTS size;

-- 3. PROVERA - Da li je sve sada u redu?
SELECT 
    'cart_items' as tabela,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'user_id'
    ) THEN '✓' ELSE '✗' END as user_id,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'size'
    ) THEN '✓' ELSE '✗' END as size,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN '✓' ELSE '✗' END as updated_at,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'cart_items' 
        AND indexname = 'cart_items_user_product_size_unique'
    ) THEN '✓' ELSE '✗' END as unique_index,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'cart_items' AND rowsecurity = true
    ) THEN '✓' ELSE '✗' END as rls_enabled
UNION ALL
SELECT 
    'favorites' as tabela,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'user_id'
    ) THEN '✓' ELSE '✗' END as user_id,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'favorites' AND column_name = 'product_id'
    ) THEN '✓' ELSE '✗' END as product_id,
    'N/A' as updated_at,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'favorites' 
        AND indexname = 'favorites_user_product_unique'
    ) THEN '✓' ELSE '✗' END as unique_index,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'favorites' AND rowsecurity = true
    ) THEN '✓' ELSE '✗' END as rls_enabled;
