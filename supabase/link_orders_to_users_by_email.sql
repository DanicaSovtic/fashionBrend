-- Povezuje porudžbine sa korisnicima po emailu (recipient_email = auth.users.email)
-- Koristi kada stare porudžbine nemaju user_id, pa loyalty backfill ne može da dodeli poene.
-- Pokreni u Supabase SQL Editoru (jednom). Zahteva pristup auth.users (admin).

UPDATE orders o
SET user_id = u.id
FROM auth.users u
WHERE o.recipient_email IS NOT NULL
  AND (o.user_id IS NULL OR o.user_id != u.id)
  AND lower(trim(o.recipient_email)) = lower(trim(u.email));

-- Provera: koliko porudžbina je sada povezano
-- SELECT count(*) FROM orders WHERE user_id IS NOT NULL;
