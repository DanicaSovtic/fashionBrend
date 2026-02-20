-- Migracija: Dodavanje novih uloga 'racunovodja' i 'marketing_asistent'
-- Pokrenuti u Supabase SQL Editor
-- Ovaj upit je siguran za pokretanje više puta (idempotent)

-- KORAK 1: Proveri trenutni constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'profiles_role_check';

-- KORAK 2: Ukloni postojeći constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- KORAK 3: Dodaj novi constraint sa svim ulogama uključujući nove
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

-- KORAK 4: Provera - prikaži sve uloge u sistemu
SELECT 
    role,
    count(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;

-- KORAK 5: Provera - prikaži novu definiciju constraint-a
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'profiles_role_check';
