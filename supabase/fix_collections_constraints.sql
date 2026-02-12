-- ============================================
-- SQL UPITI ZA ISPRAVKU COLLECTIONS CONSTRAINT-A
-- Ovaj fajl je siguran za višestruko izvršavanje
-- ============================================

-- Dodaj kolone ako ne postoje
ALTER TABLE collections ADD COLUMN IF NOT EXISTS collection_type text NOT NULL DEFAULT 'outfit';
ALTER TABLE collections ADD COLUMN IF NOT EXISTS outfit_style text;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS event_date date;

-- Proveri da li tabela collections postoji pre nego što menjamo constraint-e
DO $$
BEGIN
  -- Drop i recreate collections_status_check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'collections_status_check' 
    AND conrelid = 'collections'::regclass
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_status_check;
  END IF;
  
  ALTER TABLE collections
    ADD CONSTRAINT collections_status_check CHECK (
      status IN ('planned', 'active', 'archived')
    );

  -- Drop i recreate collections_type_check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'collections_type_check' 
    AND conrelid = 'collections'::regclass
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_type_check;
  END IF;
  
  ALTER TABLE collections
    ADD CONSTRAINT collections_type_check CHECK (
      collection_type IN ('outfit', 'blog')
    );

  -- Drop i recreate collections_outfit_style_check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'collections_outfit_style_check' 
    AND conrelid = 'collections'::regclass
  ) THEN
    ALTER TABLE collections DROP CONSTRAINT collections_outfit_style_check;
  END IF;
  
  ALTER TABLE collections
    ADD CONSTRAINT collections_outfit_style_check CHECK (
      outfit_style IS NULL OR outfit_style IN ('TRENDY', 'VIRAL', 'TAILORING', 'CASUAL')
    );

END $$;

-- Proveri da li su constraint-i kreirani
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'collections'::regclass
AND conname IN ('collections_status_check', 'collections_type_check', 'collections_outfit_style_check')
ORDER BY conname;
