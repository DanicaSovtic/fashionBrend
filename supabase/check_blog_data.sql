-- SQL upit za proveru blog podataka u bazi

-- 1. Proveri da li postoje tabele
SELECT 
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('blog_posts', 'blog_categories', 'blog_post_categories')
ORDER BY table_name;

-- 2. Proveri broj kategorija
SELECT COUNT(*) as total_categories FROM blog_categories;

-- 3. Prikaži sve kategorije
SELECT id, name, slug, description, created_at 
FROM blog_categories 
ORDER BY name;

-- 4. Proveri broj blog postova
SELECT 
    status,
    COUNT(*) as count
FROM blog_posts
GROUP BY status;

-- 5. Prikaži sve objavljene blog postove
SELECT 
    id,
    title,
    slug,
    status,
    published_at,
    created_at,
    CASE 
        WHEN published_at IS NULL THEN 'Nema datum objave'
        WHEN published_at > NOW() THEN 'Buduća objava'
        WHEN published_at <= NOW() THEN 'Objavljeno'
    END as publish_status
FROM blog_posts
WHERE status = 'published'
ORDER BY published_at DESC;

-- 6. Proveri veze između postova i kategorija
SELECT 
    bp.id as post_id,
    bp.title,
    bp.status,
    bp.published_at,
    bc.id as category_id,
    bc.name as category_name,
    bc.slug as category_slug
FROM blog_posts bp
LEFT JOIN blog_post_categories bpc ON bp.id = bpc.post_id
LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
WHERE bp.status = 'published'
ORDER BY bp.published_at DESC, bc.name;

-- 7. Proveri RLS policies
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

-- 8. Test query koji bi trebalo da vrati objavljene postove (kao što backend radi)
SELECT 
    bp.*,
    json_agg(
        json_build_object(
            'id', bc.id,
            'name', bc.name,
            'slug', bc.slug
        )
    ) FILTER (WHERE bc.id IS NOT NULL) as categories
FROM blog_posts bp
LEFT JOIN blog_post_categories bpc ON bp.id = bpc.post_id
LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
WHERE bp.status = 'published'
    AND bp.published_at IS NOT NULL
    AND bp.published_at <= NOW()
GROUP BY bp.id
ORDER BY bp.published_at DESC;
