-- Migracija: Dodavanje novih uloga 'racunovodja' i 'marketing_asistent'
-- Pokrenuti u Supabase SQL Editor
-- Ovaj upit je siguran za pokretanje više puta (idempotent)

-- 1. Ukloni postojeći constraint (ako postoji)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Dodaj novi constraint sa svim ulogama uključujući nove
-- Napomena: Ako dobijete grešku da constraint već postoji, 
-- pokrenite samo prvi deo (DROP CONSTRAINT) pa zatim drugi deo (ADD CONSTRAINT) odvojeno
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

-- 2. Provera: Prikaži sve uloge u sistemu
select 
    role,
    count(*) as user_count
from profiles
group by role
order by role;

-- 3. Provera: Prikaži strukturu constraint-a
select 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conname = 'profiles_role_check';
