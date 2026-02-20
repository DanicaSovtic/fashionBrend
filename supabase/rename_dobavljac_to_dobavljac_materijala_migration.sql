-- Migracija: Preimenovanje uloge 'dobavljac' u 'dobavljac_materijala'
-- Ovaj upit je siguran za pokretanje više puta (idempotent)

-- 1. Privremeno ukloni constraint da bi mogli da ažuriramo podatke
alter table profiles
  drop constraint if exists profiles_role_check;

-- 2. Ažuriraj postojeće podatke: promeni 'dobavljac' u 'dobavljac_materijala'
update profiles
set role = 'dobavljac_materijala'
where role = 'dobavljac';

-- 3. Vrati constraint sa novom vrednošću
alter table profiles
  add constraint profiles_role_check check (
    role in (
      'superadmin',
      'modni_dizajner',
      'dobavljac_materijala',
      'proizvodjac',
      'tester_kvaliteta',
      'laborant',
      'distributer',
      'krajnji_korisnik'
    )
  );

-- 4. Provera: Prikaži sve korisnike sa novom ulogom
select 
    user_id,
    full_name,
    role,
    created_at
from profiles
where role = 'dobavljac_materijala'
order by created_at desc;

-- 5. Provera: Proveri da li postoje još korisnici sa starom ulogom (trebalo bi da bude 0)
select 
    count(*) as count_old_role
from profiles
where role = 'dobavljac';

-- 6. Provera: Prikaži sve uloge u sistemu
select 
    role,
    count(*) as user_count
from profiles
group by role
order by role;
