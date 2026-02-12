# Blog Setup - Uputstva za Pokretanje

## Problem: 401 Unauthorized greške

Ako vidite 401 greške za `/api/blog/categories` i `/api/blog/posts`, to znači da tabele još nisu kreirane u Supabase bazi.

## Rešenje: Pokrenite SQL skriptu

### Korak 1: Otvorite Supabase Dashboard
1. Idite na https://app.supabase.com
2. Izaberite vaš projekat
3. Kliknite na "SQL Editor" u levom meniju

### Korak 2: Pokrenite SQL skriptu
1. Otvorite fajl `supabase/blog_schema.sql` u editoru
2. Kopirajte **CEO** sadržaj fajla
3. Zalepite u Supabase SQL Editor
4. Kliknite "Run" ili pritisnite `Ctrl+Enter`

### Korak 3: Proverite da li su tabele kreirane
1. Idite na "Table Editor" u levom meniju
2. Proverite da li postoje tabele:
   - `blog_posts`
   - `blog_categories`
   - `blog_post_categories`

### Korak 4: Proverite RLS Policies
1. Idite na "Authentication" → "Policies" u Supabase Dashboard-u
2. Proverite da li postoje policies za blog tabele:
   - `blog_posts`: "Anyone can view published blog posts"
   - `blog_categories`: "Anyone can view blog categories"
   - `blog_post_categories`: "Anyone can view blog post categories for published posts"

### Korak 5: Restartujte backend server
```bash
cd backend
npm run dev
```

### Korak 6: Testirajte
1. Otvorite `/blog` u browseru
2. Trebalo bi da vidite listu blog postova (ili praznu listu ako nema postova)

## Ako i dalje dobijate 401 greške:

### Proverite environment varijable u backend/.env:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Proverite backend logove:
Trebalo bi da vidite:
```
[BlogService] Admin client created successfully
[BlogRoute] GET /blog/categories - Request received
[BlogService] Fetching blog categories...
```

Ako vidite greške poput "relation 'blog_categories' does not exist", to znači da tabele nisu kreirane - pokrenite SQL skriptu.

## Dodatno: Ako želite da osigurate da RLS policies rade bez autentifikacije

Pokrenite i `supabase/fix_blog_rls.sql` nakon `blog_schema.sql`:

1. Otvorite `supabase/fix_blog_rls.sql`
2. Kopirajte sadržaj
3. Pokrenite u Supabase SQL Editor-u

Ovaj fajl osigurava da RLS policies dozvoljavaju pristup bez autentifikacije.
