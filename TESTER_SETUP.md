# Tester kvaliteta – postavljanje

## 1. Kreiranje korisnika

### Opcija A: Preko Superadmin panela (preporučeno)

1. Uloguj se kao **superadmin**.
2. Idi na **Korisnici** → **Kreiraj korisnika**.
3. Popuni: Ime, Email, Lozinka (opciono – može se generisati).
4. U polju **Uloga** izaberi **🧪 Tester kvaliteta**.
5. Klikni **Kreiraj korisnika**.

### Opcija B: Direktno u Supabase

Ako već imaš korisnika u `auth.users`, samo ažuriraj `profiles`:

```sql
-- Postavi ulogu tester_kvaliteta za postojećeg korisnika
UPDATE profiles
SET role = 'tester_kvaliteta'
WHERE user_id = 'UUID_TVOG_KORISNIKA';
```

Za novog korisnika koristi Supabase Auth (npr. Dashboard → Authentication → Add user) i zatim dodaj zapis u `profiles` sa `role = 'tester_kvaliteta'`.

## 2. Prijavljivanje

- Email i lozinka koje si uneo pri kreiranju.
- Tester vidi u navigaciji link **Pregled kvaliteta** → `/tester/collections`.

## 3. Šta tester može

- **Da vidi** sve kolekcije dizajnera.
- **Da pregleda** modele, odobrenja, tehničke podatke.
- **Da dodaje komentare** na modele (npr. o kvalitetu, procenat pamuka).
- **Ne može** da menja status kolekcije, uređuje ili briše kolekcije i modele.
