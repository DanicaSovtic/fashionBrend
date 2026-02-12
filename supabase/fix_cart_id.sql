-- ============================================
-- SQL UPITI ZA ISPRAVKU cart_id PROBLEMA
-- Problem: cart_id kolona ima NOT NULL constraint ali ne koristimo je više
-- ============================================

-- 1. UKLONI NOT NULL CONSTRAINT SA cart_id KOLONE (ako postoji)
ALTER TABLE cart_items ALTER COLUMN cart_id DROP NOT NULL;

-- 2. PROVERA - Da li je cart_id sada nullable
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cart_items' 
    AND column_name = 'cart_id';

-- 3. OPCIONO: Obriši cart_id kolonu potpuno (ako ne želiš da je zadržiš)
-- Preporučujem da obrišeš kolonu pošto je ne koristimo više
-- ALTER TABLE cart_items DROP COLUMN IF EXISTS cart_id;
