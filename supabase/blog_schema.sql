-- Blog Posts Schema
-- Tabela za blog postove koje kreira superadmin

-- Kreiranje tabele blog_posts
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null, -- URL-friendly verzija naslova
  excerpt text, -- Kratak opis/preview tekst
  content text not null, -- Glavni tekst (rich text)
  featured_image_url text, -- Naslovna slika
  published_at timestamp with time zone, -- Datum objave (null = draft)
  status text not null default 'draft', -- draft, published, archived
  created_by uuid references profiles(user_id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Kreiranje tabele blog_categories za kategorije/oznake
create table if not exists blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default now()
);

-- Povezna tabela za many-to-many vezu između postova i kategorija
create table if not exists blog_post_categories (
  post_id uuid references blog_posts(id) on delete cascade,
  category_id uuid references blog_categories(id) on delete cascade,
  primary key (post_id, category_id)
);

-- Dodaj constraint za status
alter table blog_posts
  drop constraint if exists blog_posts_status_check;

alter table blog_posts
  add constraint blog_posts_status_check check (
    status in ('draft', 'published', 'archived')
  );

-- Kreiranje indeksa za brže pretrage
create index if not exists idx_blog_posts_status on blog_posts(status);
create index if not exists idx_blog_posts_published_at on blog_posts(published_at);
create index if not exists idx_blog_posts_created_at on blog_posts(created_at desc);
create index if not exists idx_blog_posts_slug on blog_posts(slug);
create index if not exists idx_blog_post_categories_post_id on blog_post_categories(post_id);
create index if not exists idx_blog_post_categories_category_id on blog_post_categories(category_id);

-- Funkcija za automatsko generisanje slug-a iz naslova
create or replace function generate_slug(title text)
returns text as $$
declare
  slug text;
begin
  -- Konvertuj u lowercase, zameni specijalne karaktere sa crticama
  slug := lower(title);
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  
  -- Proveri da li slug već postoji, ako da dodaj broj
  if exists (select 1 from blog_posts where blog_posts.slug = slug) then
    slug := slug || '-' || extract(epoch from now())::text;
  end if;
  
  return slug;
end;
$$ language plpgsql;

-- Trigger za automatsko ažuriranje updated_at
create or replace function update_blog_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_blog_posts_updated_at on blog_posts;
create trigger trigger_update_blog_posts_updated_at
  before update on blog_posts
  for each row
  execute function update_blog_posts_updated_at();

-- Row Level Security (RLS) Policies

-- Omogući RLS na blog_posts tabeli
alter table blog_posts enable row level security;

-- Javni pregled: svi mogu da vide objavljene postove
drop policy if exists "Anyone can view published blog posts" on blog_posts;
create policy "Anyone can view published blog posts"
  on blog_posts for select
  using (status = 'published' and published_at is not null and published_at <= now());

-- Superadmin može sve: kreirati, čitati, ažurirati, brisati
drop policy if exists "Superadmin can manage all blog posts" on blog_posts;
create policy "Superadmin can manage all blog posts"
  on blog_posts for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'superadmin'
    )
  );

-- Omogući RLS na blog_categories tabeli
alter table blog_categories enable row level security;

-- Svi mogu da vide kategorije
drop policy if exists "Anyone can view blog categories" on blog_categories;
create policy "Anyone can view blog categories"
  on blog_categories for select
  using (true);

-- Superadmin može da upravlja kategorijama
drop policy if exists "Superadmin can manage blog categories" on blog_categories;
create policy "Superadmin can manage blog categories"
  on blog_categories for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'superadmin'
    )
  );

-- Omogući RLS na blog_post_categories tabeli
alter table blog_post_categories enable row level security;

-- Svi mogu da vide veze između postova i kategorija (za objavljene postove)
drop policy if exists "Anyone can view blog post categories for published posts" on blog_post_categories;
create policy "Anyone can view blog post categories for published posts"
  on blog_post_categories for select
  using (
    exists (
      select 1 from blog_posts
      where blog_posts.id = blog_post_categories.post_id
      and blog_posts.status = 'published'
      and blog_posts.published_at is not null
      and blog_posts.published_at <= now()
    )
  );

-- Superadmin može da upravlja vezama
drop policy if exists "Superadmin can manage blog post categories" on blog_post_categories;
create policy "Superadmin can manage blog post categories"
  on blog_post_categories for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'superadmin'
    )
  );

-- Insert default kategorije
insert into blog_categories (id, name, slug, description)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fashion Week', 'fashion-week', 'Događaji i najave vezane za fashion week'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Nove Kolekcije', 'nove-kolekcije', 'Najave i predstavljanje novih kolekcija'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sniženja', 'snizenja', 'Sezonska sniženja i promocije'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Loyalty Club', 'loyalty-club', 'Informacije o loyalty club programu i pogodnostima'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Promocije', 'promocije', 'Specijalne ponude i promocije')
on conflict (id) do nothing;

-- Sample blog postovi za testiranje (opciono)
-- Napomena: created_by će biti postavljen kada superadmin kreira post kroz aplikaciju
insert into blog_posts (id, title, slug, excerpt, content, featured_image_url, published_at, status, created_by)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Belgrade Fashion Week 2026 - Najava',
    'belgrade-fashion-week-2026-najava',
    'Spremite se za najveći modni događaj godine! Belgrade Fashion Week 2026 donosi najnovije trendove i kolekcije vrhunskih dizajnera.',
    '<h2>Belgrade Fashion Week 2026</h2><p>Radujemo se što možemo da vam najavimo jedan od najvažnijih modnih događaja u regionu - Belgrade Fashion Week 2026. Ovaj spektakularan događaj će se održati od 15. do 20. septembra 2026. godine.</p><p>Tokom ovih dana, imaćete priliku da vidite najnovije kolekcije vrhunskih modnih dizajnera, učestvujete u ekskluzivnim prezentacijama i upoznate najnovije trendove koji će oblikovati modnu scenu u narednoj sezoni.</p><h3>Šta vas čeka?</h3><ul><li>Ekskluzivne modne revije</li><li>Meet & Greet sa dizajnerima</li><li>Specijalne popuste za učesnike</li><li>Networking događaji</li></ul>',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80',
    now() - interval '5 days',
    'published',
    null
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Nova Zimska Kolekcija 2026 - Predstavljanje',
    'nova-zimska-kolekcija-2026-predstavljanje',
    'Otkrijte našu novu zimsku kolekciju koja kombinuje eleganciju i funkcionalnost za savršen zimski stil.',
    '<h2>Nova Zimska Kolekcija 2026</h2><p>Sa ponosom predstavljamo našu najnoviju zimsku kolekciju koja donosi savršen balans između elegancije i praktičnosti.</p><p>Kolekcija obuhvata širok spektar komada - od toplih zimskih kaputa do elegantnih haljina za praznične prilike.</p>',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    now() - interval '2 days',
    'published',
    null
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Sezonsko Sniženje - Do 50% Popusta',
    'sezonsko-snizenje-do-50-popusta',
    'Iskoristite priliku i obnovite svoju garderobu sa našim sezonskim sniženjem. Popusti do 50% na selektovane artikle!',
    '<h2>Sezonsko Sniženje</h2><p>Ne propustite našu najbolju ponudu godine! Sezonsko sniženje traje do kraja meseca i možete pronaći popuste do 50% na selektovane artikle iz prošle sezone.</p><p>Ponuda važi dok traju zalihe, tako da požurite!</p>',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80',
    now() - interval '1 day',
    'published',
    null
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Učlanite se u Loyalty Club - Ekskluzivne Pogodnosti',
    'uclanite-se-u-loyalty-club-ekskluzivne-pogodnosti',
    'Postanite član našeg Loyalty Club programa i uživajte u ekskluzivnim pogodnostima, ranim pristupima novim kolekcijama i posebnim popustima.',
    '<h2>Loyalty Club Program</h2><p>Želite li da budete prvi koji će videti nove kolekcije? Želite li ekskluzivne popuste i pogodnosti?</p><p>Učlanite se u naš Loyalty Club program i uživajte u:</p><ul><li>Ekskluzivnim popustima do 20%</li><li>Ranom pristupu novim kolekcijama</li><li>Besplatnoj dostavi za sve porudžbine</li><li>Posebnim događajima i prezentacijama</li><li>Akumulaciji poena za dodatne nagrade</li></ul><p>Učlanjenje je besplatno i traje samo nekoliko minuta!</p>',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    now(),
    'published',
    null
  )
on conflict (id) do nothing;

-- Poveži sample postove sa kategorijama
insert into blog_post_categories (post_id, category_id)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Fashion Week
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), -- Nove Kolekcije
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc'), -- Sniženja
  ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'), -- Promocije
  ('44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd') -- Loyalty Club
on conflict do nothing;
