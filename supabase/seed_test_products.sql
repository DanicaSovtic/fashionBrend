-- ============================================
-- Novi proizvodi za testiranje
-- Jedna test kolekcija + 5 modela u fazi "idea"
-- Pokreni u Supabase SQL Editoru (prilagodi created_by ako treba)
-- ============================================

-- 1. Nova kolekcija za testiranje (ako već postoji, preskoči)
INSERT INTO collections (
  id,
  name,
  season,
  status,
  description,
  collection_type,
  created_by
)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Test kolekcija 2026',
  'Proleće/Leto 2026',
  'active',
  'Kolekcija namenjena testiranju celokupnog životnog ciklusa: zahtev za materijal, dobavljač, proizvođač, šivenje, testiranje, odobrenje i prodaja.',
  'outfit',
  (SELECT user_id FROM profiles WHERE role = 'modni_dizajner' LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- 2. Pet novih modela u fazi "idea" (različite kategorije)
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
    'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Pamučna letnja haljina',
    'MD-T26-001',
    'Haljine',
    'idea',
    'Lagana haljina od prirodnog pamuka za tople dane.',
    'Mediteranski stil, prirodni materijali.',
    'bela, bež, lavanda',
    'Midi, Maxi',
    'A-line, izrez u V, vezani pojas.',
    'Pamuk 100%',
    'XS–XL',
    'Pranje na 30°C, sušiti na vazduhu.',
    4500
  ),
  (
    'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Oversize pamučna majica',
    'MD-T26-002',
    'Majice',
    'idea',
    'Udobna oversize majica za svakodnevno nošenje.',
    'Minimalizam, unisex krojevi.',
    'crna, siva, bordo',
    'Kratki rukav, Dugi rukav',
    'Širok kroj, ravan rub, srednja dužina.',
    'Pamuk 95%, Elastan 5%',
    'S–XXL',
    'Pranje na 40°C, peglanje na srednjoj temperaturi.',
    2800
  ),
  (
    'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Pletena midi suknja',
    'MD-T26-003',
    'Suknje',
    'idea',
    'Midi suknja od pletenog materijala za prelazne sezone.',
    'Retro pleteni uzorci, ženski silueti.',
    'krem, braon, zelena',
    'Midi, Maxi',
    'Pleteni uzorak, visoki struk, zatvaranje na zadnjoj strani.',
    'Pamuk 80%, Poliester 20%',
    'XS–L',
    'Ručno pranje ili delikatni program.',
    5200
  ),
  (
    'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Slim fit pamučne pantalone',
    'MD-T26-004',
    'Pantalone',
    'idea',
    'Elegantne pantalone za posao i izlazak.',
    'Savremeni office wear, čiste linije.',
    'crna, navy, antracit',
    'Regular, Visoki struk',
    'Slim fit, ravne nogavice, unutrašnji dugmad.',
    'Pamuk 97%, Elastan 3%',
    'XS–XXL',
    'Pranje na 30°C, peglati na niskoj temperaturi.',
    3800
  ),
  (
    'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Lagana ljetna jakna',
    'MD-T26-005',
    'Jakne',
    'idea',
    'Laka jakna od lanenog mešavine za večernje hladnoće.',
    'Resort wear, priobalni stil.',
    'bež, bela, tamno plava',
    'Regular, Cropped',
    'Jednobojna, rever, džepovi sa strane.',
    'Lan 55%, Pamuk 45%',
    'S–XL',
    'Samo kemijsko čišćenje ili ručno pranje.',
    7500
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Redovi u products (povezani sa modelima iznad); image_url = NULL – unesi linkove ka slikama ručno
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
  sku,
  product_model_id
)
VALUES
  (
    'a1a1a1a1-0001-4a5b-8c9d-0e1f2a3b4c5d',
    'Pamučna letnja haljina',
    'Lagana haljina od prirodnog pamuka za tople dane.',
    4500,
    'Haljine',
    NULL,
    'Pamuk 100%',
    'Pranje na 30°C, sušiti na vazduhu.',
    'Proizvedeno u Srbiji',
    'MD-T26-001',
    'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e'
  ),
  (
    'a1a1a1a1-0002-4a5b-8c9d-0e1f2a3b4c5d',
    'Oversize pamučna majica',
    'Udobna oversize majica za svakodnevno nošenje.',
    2800,
    'Majice',
    NULL,
    'Pamuk 95%, Elastan 5%',
    'Pranje na 40°C, peglanje na srednjoj temperaturi.',
    'Proizvedeno u Srbiji',
    'MD-T26-002',
    'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f'
  ),
  (
    'a1a1a1a1-0003-4a5b-8c9d-0e1f2a3b4c5d',
    'Pletena midi suknja',
    'Midi suknja od pletenog materijala za prelazne sezone.',
    5200,
    'Suknje',
    NULL,
    'Pamuk 80%, Poliester 20%',
    'Ručno pranje ili delikatni program.',
    'Proizvedeno u Srbiji',
    'MD-T26-003',
    'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a'
  ),
  (
    'a1a1a1a1-0004-4a5b-8c9d-0e1f2a3b4c5d',
    'Slim fit pamučne pantalone',
    'Elegantne pantalone za posao i izlazak.',
    3800,
    'Pantalone',
    NULL,
    'Pamuk 97%, Elastan 3%',
    'Pranje na 30°C, peglati na niskoj temperaturi.',
    'Proizvedeno u Srbiji',
    'MD-T26-004',
    'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b'
  ),
  (
    'a1a1a1a1-0005-4a5b-8c9d-0e1f2a3b4c5d',
    'Lagana ljetna jakna',
    'Laka jakna od lanenog mešavine za večernje hladnoće.',
    7500,
    'Jakne',
    NULL,
    'Lan 55%, Pamuk 45%',
    'Samo kemijsko čišćenje ili ručno pranje.',
    'Proizvedeno u Srbiji',
    'MD-T26-005',
    'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c'
  )
ON CONFLICT (id) DO NOTHING;

-- Kraj
