-- Nova Letnja kolekcija 2026 + proizvodi
-- Pokreni ovu skriptu u Supabase SQL editoru.

BEGIN;

WITH target_designer AS (
  SELECT COALESCE(
    (SELECT p.user_id FROM profiles p WHERE p.role = 'modni_dizajner' ORDER BY p.created_at ASC LIMIT 1),
    (SELECT c.created_by FROM collections c WHERE c.created_by IS NOT NULL ORDER BY c.created_at ASC LIMIT 1)
  ) AS user_id
),
inserted_collection AS (
  INSERT INTO collections (
    id,
    name,
    season,
    status,
    start_date,
    end_date,
    description,
    collection_type,
    outfit_style,
    image_url,
    created_by
  )
  SELECT
    'ab260001-0000-4000-8000-000000000001',
    'Nova Letnja kolekcija 2026',
    'SS26',
    'active',
    '2026-06-01',
    '2026-09-01',
    'Lagani letnji modeli sa miksom prirodnih i sintetickih materijala.',
    'outfit',
    'TRENDY',
    null,
    td.user_id
  FROM target_designer td
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    season = EXCLUDED.season,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    description = EXCLUDED.description,
    collection_type = EXCLUDED.collection_type,
    outfit_style = EXCLUDED.outfit_style,
    image_url = EXCLUDED.image_url,
    created_by = EXCLUDED.created_by
  RETURNING id
),
inserted_models AS (
  INSERT INTO product_models (
    id,
    collection_id,
    name,
    sku,
    category,
    development_stage,
    concept,
    inspiration,
    color_palette,
    variants,
    pattern_notes,
    materials,
    size_table,
    tech_notes,
    price
  )
  VALUES
    (
      'ab260001-1000-4000-8000-000000000001',
      (SELECT id FROM inserted_collection),
      'Lagana letnja haljina',
      'NLK26-001',
      'Haljine',
      'idea',
      'Leprsava midi haljina za dnevne i vecernje kombinacije.',
      'Mediteranski letnji stil.',
      'puder roze, svetlo plava, bela',
      'Midi; Maxi',
      'Leprsav donji deo i diskretan struk.',
      'Sifon - 100% poliester',
      'XS-XL',
      'Zip na ledjima i postava u gornjem delu.',
      6200
    ),
    (
      'ab260001-1000-4000-8000-000000000002',
      (SELECT id FROM inserted_collection),
      'Pamucna kosulja oversized',
      'NLK26-002',
      'Kosulje',
      'idea',
      'Casual oversized kosulja za leto.',
      'Minimalisticki gradski stil.',
      'bela, svetlo zelena, bež',
      'Regular; Oversized',
      'Spustena ramena i sirina u telu.',
      'Poplin - 100% pamuk',
      'XS-XL',
      'Dugmad od sedefa.',
      4500
    ),
    (
      'ab260001-1000-4000-8000-000000000003',
      (SELECT id FROM inserted_collection),
      'Pantalone visokog struka',
      'NLK26-003',
      'Pantalone',
      'idea',
      'Elegantne pantalone za posao i izlazak.',
      'Moderni tailoring.',
      'crna, krem, maslinasta',
      'Ankle; Full length',
      'Ravan kroj i istaknut struk.',
      'Gabardin - 65% poliester / 35% viskoza',
      'XS-XL',
      'Skriveno kopcanje i bocni dzepovi.',
      7900
    ),
    (
      'ab260001-1000-4000-8000-000000000004',
      (SELECT id FROM inserted_collection),
      'Letnji komplet top + suknja',
      'NLK26-004',
      'Kompleti',
      'idea',
      'Dvodellni komplet za dnevne i beach kombinacije.',
      'Resort i city look.',
      'koralna, pesak, bela',
      'Top + mini; Top + midi',
      'Elastican pojas i lagani pad suknje.',
      'Muslin - 100% pamuk',
      'XS-L',
      'Gumirani pojas na suknji.',
      6800
    ),
    (
      'ab260001-1000-4000-8000-000000000005',
      (SELECT id FROM inserted_collection),
      'Scuba sako',
      'NLK26-005',
      'Sakoi',
      'idea',
      'Strukturirani sako modernog kroja.',
      'Smart-casual kombinacije.',
      'crna, slonovaca, teget',
      'Cropped; Regular',
      'Naglasen rever i cista silueta.',
      'Scuba sa elastanom - 95% poliester / 5% elastan',
      'S-XL',
      'Predvidjeno postavljanje lagane postave.',
      11000
    ),
    (
      'ab260001-1000-4000-8000-000000000006',
      (SELECT id FROM inserted_collection),
      'Elegantna bluza od satena',
      'NLK26-006',
      'Bluze',
      'idea',
      'Bluza sa blagim sjajem za vecernje kombinacije.',
      'Cist i sofisticiran dizajn.',
      'sampanj, crna, bordo',
      'Kratak rukav; Dugi rukav',
      'Lagano drapiranje oko vrata.',
      'Elastični saten - 95% poliester / 5% elastan',
      'XS-XL',
      'Diskretan otvor na ledjima sa dugmetom.',
      5300
    )
  ON CONFLICT (id) DO UPDATE
  SET
    collection_id = EXCLUDED.collection_id,
    name = EXCLUDED.name,
    sku = EXCLUDED.sku,
    category = EXCLUDED.category,
    development_stage = EXCLUDED.development_stage,
    concept = EXCLUDED.concept,
    inspiration = EXCLUDED.inspiration,
    color_palette = EXCLUDED.color_palette,
    variants = EXCLUDED.variants,
    pattern_notes = EXCLUDED.pattern_notes,
    materials = EXCLUDED.materials,
    size_table = EXCLUDED.size_table,
    tech_notes = EXCLUDED.tech_notes,
    price = EXCLUDED.price,
    updated_at = now()
  RETURNING id, name, sku, price, materials
)
INSERT INTO products (
  id,
  title,
  description,
  price,
  category,
  image_url,
  sastav,
  odrzavanje,
  poreklo,
  created_at,
  sku,
  product_model_id
)
SELECT
  (
  CASE m.sku
    WHEN 'NLK26-001' THEN 'ab260001-2000-4000-8000-000000000001'
    WHEN 'NLK26-002' THEN 'ab260001-2000-4000-8000-000000000002'
    WHEN 'NLK26-003' THEN 'ab260001-2000-4000-8000-000000000003'
    WHEN 'NLK26-004' THEN 'ab260001-2000-4000-8000-000000000004'
    WHEN 'NLK26-005' THEN 'ab260001-2000-4000-8000-000000000005'
    WHEN 'NLK26-006' THEN 'ab260001-2000-4000-8000-000000000006'
  END
  )::uuid AS id,
  m.name AS title,
  'Proizvod iz kolekcije Nova Letnja kolekcija 2026. Slike ce biti dodate naknadno.' AS description,
  m.price AS price,
  m.category AS category,
  null AS image_url,
  m.materials AS sastav,
  'Pranje prema etiketi i preporuci proizvodjaca materijala.' AS odrzavanje,
  'Srbija' AS poreklo,
  now() AS created_at,
  m.sku,
  m.id AS product_model_id
FROM (
  SELECT
    im.id,
    im.name,
    im.sku,
    im.price,
    CASE
      WHEN im.sku = 'NLK26-001' THEN 'Haljine'
      WHEN im.sku = 'NLK26-002' THEN 'Kosulje'
      WHEN im.sku = 'NLK26-003' THEN 'Pantalone'
      WHEN im.sku = 'NLK26-004' THEN 'Kompleti'
      WHEN im.sku = 'NLK26-005' THEN 'Sakoi'
      WHEN im.sku = 'NLK26-006' THEN 'Bluze'
      ELSE 'Odeca'
    END AS category,
    im.materials
  FROM inserted_models im
) m
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  sastav = EXCLUDED.sastav,
  odrzavanje = EXCLUDED.odrzavanje,
  poreklo = EXCLUDED.poreklo,
  sku = EXCLUDED.sku,
  product_model_id = EXCLUDED.product_model_id;

COMMIT;
