-- Migracija: Dodavanje novih uloga 'racunovodja' i 'marketing_asistent'
-- Pokrenuti u Supabase SQL Editor
-- Ovaj upit je siguran za pokretanje više puta (idempotent)

-- Alternativni pristup: Koristi DO blok za sigurno ažuriranje constraint-a

DO $$ 
BEGIN
  -- Ukloni constraint ako postoji
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Dodaj novi constraint
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check CHECK (
      role IN (
        'superadmin',
        'modni_dizajner',
        'dobavljac_materijala',
        'proizvodjac',
        'tester_kvaliteta',
        'laborant',
        'distributer',
        'krajnji_korisnik',
        'racunovodja',
        'marketing_asistent'
      )
    );
END $$;

-- Provera: Prikaži sve uloge u sistemu
SELECT 
    role,
    count(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;

-- Provera: Prikaži strukturu constraint-a
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'profiles_role_check';
