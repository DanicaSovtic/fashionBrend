-- Dodavanje uloge 'laborant' u sistem
-- Pokrenuti u Supabase SQL Editor

-- 1. Ažuriraj constraint za profiles tabelu
alter table profiles
  drop constraint if exists profiles_role_check;

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
      'krajnji_korisnik',
      'racunovodja',
      'marketing_asistent'
    )
  );

-- 2. Primer: Kreiranje korisnika za laboranta
-- (Koristi Supabase Auth UI ili admin panel)
-- Email: lab@piccola.com
-- Password: [generiši siguran password]
-- Full Name: Laborant Piccola
-- Role: laborant
