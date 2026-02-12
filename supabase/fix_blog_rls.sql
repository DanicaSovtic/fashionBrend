-- Fix RLS policies za blog tabele da rade bez autentifikacije
-- Ovo osigurava da javne rute rade bez potrebe za autentifikacijom

-- 1. Blog Categories - dozvoli pristup svima bez autentifikacije
alter table blog_categories enable row level security;

drop policy if exists "Anyone can view blog categories" on blog_categories;
create policy "Anyone can view blog categories"
  on blog_categories for select
  using (true);

-- Takođe dozvoli pristup bez autentifikacije za service role
-- (ovo je neophodno za backend pristup)
-- Napomena: Service role key automatski zaobilaazi RLS, ali ovo osigurava da i anon key radi

-- 2. Blog Posts - dozvoli pristup objavljenim postovima bez autentifikacije
alter table blog_posts enable row level security;

drop policy if exists "Anyone can view published blog posts" on blog_posts;
create policy "Anyone can view published blog posts"
  on blog_posts for select
  using (
    status = 'published' 
    and published_at is not null 
    and published_at <= now()
  );

-- 3. Blog Post Categories - dozvoli pristup vezama za objavljene postove
alter table blog_post_categories enable row level security;

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

-- 4. Superadmin policies ostaju iste (za upravljanje)
-- Ove policies su već kreirane u blog_schema.sql

-- 5. Provera da li su policies kreirane
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('blog_posts', 'blog_categories', 'blog_post_categories')
ORDER BY tablename, policyname;
