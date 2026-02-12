# Blog Implementacija - Korak po Korak Vodič

## 📋 Pregled

Implementirana je kompletan Blog sistem sa sledećim funkcionalnostima:
- **Javna stranica Blog** - lista svih objavljenih blog postova
- **Detaljna stranica blog posta** - prikaz pojedinačnog posta
- **Admin panel** - upravljanje blog postovima (samo za superadmin)

## 🗄️ 1. SQL Schema

### Fajl: `supabase/blog_schema.sql`

Ovaj fajl sadrži:
- Tabelu `blog_posts` - glavna tabela za blog postove
- Tabelu `blog_categories` - kategorije/oznake za blog postove
- Tabelu `blog_post_categories` - veza između postova i kategorija (many-to-many)
- RLS (Row Level Security) policies za bezbednost
- Indekse za optimizaciju pretrage
- Sample podatke za testiranje

**Kako koristiti:**
```sql
-- Pokrenite SQL fajl u Supabase SQL editoru ili kroz psql
\i supabase/blog_schema.sql
```

## 🔧 2. Backend Implementacija

### Fajlovi:
- `backend/services/blogService.js` - servis za rad sa blog postovima
- `backend/routes/blog.js` - Express rute za blog API
- `backend/server.js` - ažuriran da uključi blog rute

### API Endpoints:

#### Javni endpoints (dostupni svima):
- `GET /api/blog/posts` - lista svih objavljenih blog postova
  - Query parametri: `category`, `limit`, `offset`, `search`
- `GET /api/blog/posts/:slugOrId` - dobavi jedan blog post
- `GET /api/blog/categories` - lista svih kategorija

#### Admin endpoints (samo za superadmin):
- `GET /api/blog/admin/posts` - lista svih blog postova (uključujući draft i archived)
- `GET /api/blog/admin/posts/:id` - dobavi jedan blog post po ID-u
- `POST /api/blog/admin/posts` - kreiraj novi blog post
- `PATCH /api/blog/admin/posts/:id` - ažuriraj blog post
- `DELETE /api/blog/admin/posts/:id` - obriši blog post
- `PATCH /api/blog/admin/posts/:id/status` - promeni status (draft/published/archived)
- `POST /api/blog/admin/categories` - kreiraj novu kategoriju

## 🎨 3. Frontend Implementacija

### Komponente:

#### 3.1. Blog List Page (`src/components/Blog.jsx`)
**Ruta:** `/blog`

**Funkcionalnosti:**
- Prikazuje listu svih objavljenih blog postova
- Filter po kategorijama
- Kartice sa naslovom, slikom, kratkim opisom i datumom
- Responsive dizajn

**Kako koristiti:**
- Otvorite `/blog` u browseru
- Kliknite na filter kategorije da filtrirate postove
- Kliknite na bilo koji blog post da vidite detalje

#### 3.2. Blog Detail Page (`src/components/BlogDetail.jsx`)
**Ruta:** `/blog/:slugOrId`

**Funkcionalnosti:**
- Prikazuje punu verziju blog posta
- Prikazuje kategorije, datum objave, autora
- Renderuje HTML sadržaj (rich text)
- Link za povratak na listu blog postova

**Kako koristiti:**
- Kliknite na bilo koji blog post sa liste
- Pročitajte punu verziju posta
- Koristite "Nazad na blog" link da se vratite na listu

#### 3.3. Admin Blog Management (`src/components/AdminBlog.jsx`)
**Ruta:** `/admin/blog` (samo za superadmin)

**Funkcionalnosti:**
- Lista svih blog postova (draft, published, archived)
- Kreiranje novih blog postova
- Izmena postojećih blog postova
- Brisanje blog postova
- Promena statusa (objavi, arhiviraj, vrati iz arhive)
- Filter po statusu

**Kako koristiti:**

##### Kreiranje novog blog posta:
1. Ulogujte se kao superadmin
2. Idite na `/admin/blog`
3. Kliknite na "Novi Blog Post"
4. Popunite formu:
   - **Naslov** (obavezno) - naslov blog posta
   - **Kratak opis** - tekst koji se prikazuje u listi
   - **Glavni tekst** (obavezno) - HTML sadržaj posta
   - **URL naslovne slike** - link ka slici
   - **Datum objave** - datum kada će post biti objavljen
   - **Status** - draft/published/archived
   - **Kategorije** - izaberite jednu ili više kategorija
5. Kliknite "Kreiraj"

##### Izmena blog posta:
1. U listi blog postova, kliknite "Izmeni" na željenom postu
2. Izmenite polja po potrebi
3. Kliknite "Sačuvaj izmene"

##### Objavljivanje blog posta:
1. U listi draft postova, kliknite "Objavi"
2. Post će automatski dobiti status "published" i datum objave

##### Arhiviranje blog posta:
1. U listi objavljenih postova, kliknite "Arhiviraj"
2. Post će biti premešten u arhivu i neće biti vidljiv na javnoj stranici

##### Vraćanje iz arhive:
1. U listi arhiviranih postova, kliknite "Vrati iz arhive"
2. Post će biti ponovo objavljen

##### Brisanje blog posta:
1. Kliknite "Obriši" na bilo kom postu
2. Potvrdite brisanje
3. Post će biti trajno obrisan

## 🎯 4. Navigacija

### Navbar Linkovi:
- **Blog** - javna stranica sa listom blog postova (vidljiva svima)
- **Upravljanje Blogom** - admin panel (vidljivo samo superadminu)

## 📝 5. HTML Formatiranje u Blog Postovima

Kada kreiramo blog post, možemo koristiti HTML tagove za formatiranje:

```html
<h2>Naslov sekcije</h2>
<p>Paragraf teksta.</p>
<h3>Podnaslov</h3>
<ul>
  <li>Prva stavka</li>
  <li>Druga stavka</li>
</ul>
<strong>Bold tekst</strong>
<em>Italic tekst</em>
<a href="https://example.com">Link</a>
```

## 🔐 6. Bezbednost

- **RLS Policies:** Samo objavljeni postovi su vidljivi javnosti
- **Admin pristup:** Samo superadmin može kreirati, menjati i brisati postove
- **Authentication:** Admin endpoints zahtevaju autentifikaciju i superadmin ulogu

## 🚀 7. Pokretanje

1. **Pokrenite SQL skriptu:**
   ```bash
   # U Supabase dashboard-u, otvorite SQL Editor i pokrenite:
   # supabase/blog_schema.sql
   ```

2. **Pokrenite backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Pokrenite frontend:**
   ```bash
   npm install
   npm run dev
   ```

4. **Testirajte:**
   - Otvorite `/blog` za javnu stranicu
   - Ulogujte se kao superadmin i otvorite `/admin/blog` za admin panel

## 📊 8. Struktura Podataka

### Blog Post:
```javascript
{
  id: "uuid",
  title: "Naslov posta",
  slug: "naslov-posta",
  excerpt: "Kratak opis",
  content: "<h2>HTML sadržaj</h2>",
  featured_image_url: "https://...",
  published_at: "2026-02-12T10:00:00Z",
  status: "published", // draft, published, archived
  created_by: "user_uuid",
  created_at: "2026-02-12T10:00:00Z",
  updated_at: "2026-02-12T10:00:00Z",
  categories: [
    { id: "uuid", name: "Fashion Week", slug: "fashion-week" }
  ]
}
```

### Kategorija:
```javascript
{
  id: "uuid",
  name: "Fashion Week",
  slug: "fashion-week",
  description: "Opis kategorije"
}
```

## 🎨 9. Stilizovanje

Svi CSS fajlovi su kreirani:
- `src/components/Blog.css` - stilovi za javnu blog stranicu
- `src/components/AdminBlog.css` - stilovi za admin panel

Stilovi su responsive i prilagođeni postojećem dizajnu aplikacije.

## ✅ 10. Checklist za Testiranje

- [ ] SQL skripta je pokrenuta
- [ ] Backend server radi
- [ ] Frontend aplikacija radi
- [ ] Javna blog stranica prikazuje postove
- [ ] Detaljna stranica blog posta radi
- [ ] Filter po kategorijama radi
- [ ] Superadmin može kreirati novi post
- [ ] Superadmin može izmeniti post
- [ ] Superadmin može obrisati post
- [ ] Superadmin može objaviti draft post
- [ ] Superadmin može arhivirati post
- [ ] Arhivirani postovi nisu vidljivi na javnoj stranici
- [ ] Draft postovi nisu vidljivi na javnoj stranici

## 📚 11. Dodatne Napomene

- **Slug generisanje:** Slug se automatski generiše iz naslova
- **Datum objave:** Ako nije postavljen, automatski se postavlja pri objavljivanju
- **Rich text:** Koristite HTML tagove za formatiranje sadržaja
- **Slike:** Koristite URL-ove slika (možete koristiti Unsplash, Cloudinary, itd.)

## 🐛 12. Rešavanje Problema

### Problem: Blog postovi se ne prikazuju
- Proverite da li je SQL skripta pokrenuta
- Proverite da li su postovi u statusu "published"
- Proverite da li je `published_at` postavljen i u prošlosti

### Problem: Ne mogu da kreiram blog post kao superadmin
- Proverite da li ste ulogovani kao superadmin
- Proverite da li backend server radi
- Proverite konzolu za greške

### Problem: HTML se ne renderuje pravilno
- Proverite da li koristite validne HTML tagove
- Proverite da li je `dangerouslySetInnerHTML` bezbedan (samo za admin kreirane postove)

---

**Srećno sa blogom! 🎉**
