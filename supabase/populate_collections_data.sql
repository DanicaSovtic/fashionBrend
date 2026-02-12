-- ============================================
-- SQL UPITI ZA POPUNJAVANJE BAZE PODATAKA
-- Dodaje modele, verzije, komentare, odobrenja i media za sve kolekcije
-- Svaka kolekcija će imati bar 3 modela
-- ============================================

-- 1. DODAJ PROIZVODNE MODELE ZA KOLEKCIJU "Aurora SS26" (11111111-1111-1111-1111-111111111111)
-- Već postoje 2 modela, dodajemo još 2 da bude bar 4

INSERT INTO product_models (
  id, collection_id, name, sku, category, development_stage,
  concept, inspiration, color_palette, variants, pattern_notes, materials, size_table, tech_notes
)
VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'Sheer Layered Top',
    'MD-SS26-032',
    'Majice',
    'approved',
    'Slojevita transparentnost za dnevne i večernje look-ove.',
    'Contemporary art, layered textures.',
    'ivory, sky blue',
    'Long sleeve, Sleeveless',
    'Slojevita organza sa nevidljivim šavovima.',
    'Organza, Mrežasti uložak',
    'XS-L',
    'Testirati stabilnost šavova u pranju.'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'Wide Leg Trousers',
    'MD-SS26-045',
    'Pantalone',
    'approved',
    'Široke nogavice sa visokim strukom za savremeni izgled.',
    '70s fashion, architectural lines.',
    'cream, beige, navy',
    'Regular, Cropped',
    'Visoki struk, široke nogavice sa blagim taper-om.',
    'Viskoza 180g, Elastični pojas',
    'XS-XXL',
    'Proveriti padanje materijala i stabilnost šavova.'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. DODAJ PROIZVODNE MODELE ZA KOLEKCIJU "Noir Atelier FW26" (22222222-2222-2222-2222-222222222222)
-- Dodajemo 3 modela

INSERT INTO product_models (
  id, collection_id, name, sku, category, development_stage,
  concept, inspiration, color_palette, variants, pattern_notes, materials, size_table, tech_notes
)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'Wool Blend Coat',
    'MD-FW26-101',
    'Kaputi',
    'prototype',
    'Klasičan kaput sa modernim detaljima za gradsku eleganciju.',
    'British tailoring, urban architecture.',
    'charcoal, black, camel',
    'Single breasted, Double breasted',
    'Strukturirani rever, padnuti rameni, široki reveri.',
    'Vuna 70%, Poliester 30%, Podstava od viskoze',
    'S-XXL',
    'Testirati otpornost na vlagu i padanje materijala.'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '22222222-2222-2222-2222-222222222222',
    'Tailored Tweed Blazer',
    'MD-FW26-102',
    'Sakoi',
    'testing',
    'Tweed sakou sa strukturom za sofisticiran izgled.',
    'Vintage Chanel, country estate.',
    'brown, grey, black',
    'Regular, Cropped',
    'Strukturirani materijal, dvostruki rever, padnuti rameni.',
    'Tweed 100% vuna, Podstava od viskoze',
    'XS-XXL',
    'Proveriti očuvanje oblika nakon pranja.'
  ),
  (
    '11111111-1111-1111-1111-111111111112',
    '22222222-2222-2222-2222-222222222222',
    'Leather Trimmed Dress',
    'MD-FW26-103',
    'Haljine',
    'idea',
    'Midi haljina sa kožnim detaljima za večernji izgled.',
    'Rock chic, 90s minimalism.',
    'black, burgundy',
    'Midi, Maxi',
    'A-line silueta, kožni pojas i detalji na ramenima.',
    'Viskonza 200g, Koža (detalji), Podstava',
    'XS-XL',
    'Razmotriti alternativne materijale za kožne detalje.'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. DODAJ PROIZVODNE MODELE ZA KOLEKCIJU "Essenza Resort 25" (33333333-3333-3333-3333-333333333333)
-- Dodajemo 3 modela

INSERT INTO product_models (
  id, collection_id, name, sku, category, development_stage,
  concept, inspiration, color_palette, variants, pattern_notes, materials, size_table, tech_notes
)
VALUES
  (
    '22222222-2222-2222-2222-222222222223',
    '33333333-3333-3333-3333-333333333333',
    'Linen Midi Dress',
    'MD-R25-201',
    'Haljine',
    'approved',
    'Lagana midi haljina od lana za resort stil.',
    'Mediterranean style, beach elegance.',
    'white, sand, terracotta',
    'Midi, Maxi',
    'Lagana silueta, V-izrez, kratki rukavi.',
    'Lan 280g, Podstava od pamuka',
    'XS-L',
    'Proveriti očuvanje boje nakon pranja.'
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    '33333333-3333-3333-3333-333333333333',
    'Cotton Shirt Dress',
    'MD-R25-202',
    'Haljine',
    'approved',
    'Klasična košulja haljina za svakodnevni resort stil.',
    'French Riviera, casual elegance.',
    'navy, white, stripe',
    'Regular, Belted',
    'Klasičan krojevi košulje, dugi rukavi, pojas.',
    'Pamuk 100%, Podstava',
    'XS-XL',
    'Proveriti padanje materijala i očuvanje oblika.'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    'Woven Straw Bag',
    'MD-R25-203',
    'Torbe',
    'approved',
    'Pletena torba od slame za resort aksesoar.',
    'Italian craftsmanship, beach accessories.',
    'natural, beige',
    'Small, Medium',
    'Pletena struktura, kožni detalji, unutrašnji džep.',
    'Slama, Koža (detalji), Podstava',
    'One size',
    'Proveriti izdržljivost i vodootpornost.'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. DODAJ PROIZVODNE MODELE ZA KOLEKCIJU "Nova Kolekcija SS26" (93a40a93-a717-4cc2-bf7a-88b21debff88)
-- Dodajemo 3 modela

INSERT INTO product_models (
  id, collection_id, name, sku, category, development_stage,
  concept, inspiration, color_palette, variants, pattern_notes, materials, size_table, tech_notes
)
VALUES
  (
    '55555555-5555-5555-5555-555555555556',
    '93a40a93-a717-4cc2-bf7a-88b21debff88',
    'Denim Wide Leg Jeans',
    'MD-SS26-501',
    'Pantalone',
    'prototype',
    'Široke farmerke sa visokim strukom u trendovskom stilu.',
    '90s fashion, street style.',
    'light blue, medium blue, black',
    'Regular, Cropped',
    'Visoki struk, široke nogavice, klasicni farmer detalji.',
    'Denim 98% pamuk, 2% elastan',
    '24-34',
    'Testirati očuvanje boje i padanje nakon pranja.'
  ),
  (
    '66666666-6666-6666-6666-666666666667',
    '93a40a93-a717-4cc2-bf7a-88b21debff88',
    'Oversized Blazer',
    'MD-SS26-502',
    'Sakoi',
    'testing',
    'Oversized sakou za savremeni, ležeran izgled.',
    'Power dressing, 80s silhouettes.',
    'beige, camel, black',
    'Regular, Cropped',
    'Oversized fit, padnuti rameni, široki reveri.',
    'Viskonza 180g, Podstava',
    'XS-XXL',
    'Proveriti balans siluete i padanje materijala.'
  ),
  (
    '77777777-7777-7777-7777-777777777778',
    '93a40a93-a717-4cc2-bf7a-88b21debff88',
    'Ribbed Knit Top',
    'MD-SS26-503',
    'Majice',
    'approved',
    'Ribbed majica sa modernim krojem za svakodnevni stil.',
    'Minimalism, Scandinavian design.',
    'white, black, grey',
    'Long sleeve, Short sleeve, Sleeveless',
    'Ribbed tekstura, priljubljen fit, okrugli izrez.',
    'Pamuk 95%, Elastan 5%',
    'XS-XL',
    'Proveriti očuvanje oblika nakon pranja.'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. DODAJ PRODUCT_MODEL_VERSIONS za nove modele

INSERT INTO product_model_versions (id, model_id, version_number, change_summary, payload)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["ivory","sky blue"],"materials":["Organza","Mrežasti uložak"]}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["cream","beige","navy"],"materials":["Viskoza 180g","Elastični pojas"]}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccd', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["charcoal","black","camel"],"materials":["Vuna 70%","Poliester 30%"]}'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddde', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["brown","grey","black"],"materials":["Tweed 100% vuna"]}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef', '11111111-1111-1111-1111-111111111112', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["black","burgundy"],"materials":["Viskonza 200g","Koža"]}'),
  ('ffffffff-ffff-ffff-ffff-fffffffffffe', '22222222-2222-2222-2222-222222222223', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["white","sand","terracotta"],"materials":["Lan 280g"]}'),
  ('11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-333333333334', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["navy","white","stripe"],"materials":["Pamuk 100%"]}'),
  ('22222222-2222-2222-2222-222222222224', '44444444-4444-4444-4444-444444444444', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["natural","beige"],"materials":["Slama","Koža"]}'),
  ('33333333-3333-3333-3333-333333333335', '55555555-5555-5555-5555-555555555556', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["light blue","medium blue","black"],"materials":["Denim 98% pamuk","2% elastan"]}'),
  ('44444444-4444-4444-4444-444444444445', '66666666-6666-6666-6666-666666666667', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["beige","camel","black"],"materials":["Viskonza 180g"]}'),
  ('55555555-5555-5555-5555-555555555557', '77777777-7777-7777-7777-777777777778', 1,
   'Početni koncept i izbor materijala',
   '{"palette":["white","black","grey"],"materials":["Pamuk 95%","Elastan 5%"]}')
ON CONFLICT (id) DO NOTHING;

-- 6. DODAJ PRODUCT_MODEL_MEDIA za nove modele

INSERT INTO product_model_media (id, model_id, image_url, label, is_primary)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbd', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('cccccccc-cccc-cccc-cccc-ccccccccccce', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddf', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef', '11111111-1111-1111-1111-111111111112',
   'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('ffffffff-ffff-ffff-ffff-fffffffffffe', '22222222-2222-2222-2222-222222222223',
   'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('11111111-1111-1111-1111-111111111114', '33333333-3333-3333-3333-333333333334',
   'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('22222222-2222-2222-2222-222222222225', '44444444-4444-4444-4444-444444444444',
   'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('33333333-3333-3333-3333-333333333336', '55555555-5555-5555-5555-555555555556',
   'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('44444444-4444-4444-4444-444444444446', '66666666-6666-6666-6666-666666666667',
   'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true),
  ('55555555-5555-5555-5555-555555555558', '77777777-7777-7777-7777-777777777778',
   'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?auto=format&fit=crop&w=800&q=80',
   'Glavna fotografija', true)
ON CONFLICT (id) DO NOTHING;

-- 7. DODAJ PRODUCT_MODEL_COMMENTS za nove modele

INSERT INTO product_model_comments (id, model_id, author_name, role, body)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Ana Jovanović', 'proizvodjac',
   'Predlog: koristiti jači materijal za podstavu zbog transparentnosti organze.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbe', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Marko Nikolić', 'tester_kvaliteta',
   'Fit test pokazuje potrebu za dodatnim elastičnim elementima u struku.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccf', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'Jovana Stojanović', 'dobavljac',
   'Materijal je dostupan, moguće je naručiti u potrebnim količinama.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddf', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'Petar Marković', 'proizvodjac',
   'Predlog: ojačati šavove na ramenima zbog težine tweed materijala.'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef', '11111111-1111-1111-1111-111111111112',
   'Milica Đorđević', 'tester_kvaliteta',
   'Koncept je odobren, potrebno je razviti prototip za testiranje.'),
  ('ffffffff-ffff-ffff-ffff-fffffffffffe', '22222222-2222-2222-2222-222222222223',
   'Stefan Popović', 'proizvodjac',
   'Lan materijal je odličan izbor za resort kolekciju.'),
  ('11111111-1111-1111-1111-111111111115', '33333333-3333-3333-3333-333333333334',
   'Tijana Radović', 'tester_kvaliteta',
   'Fit test pokazuje odličan pad materijala, odobreno za proizvodnju.'),
  ('22222222-2222-2222-2222-222222222226', '44444444-4444-4444-4444-444444444444',
   'Nikola Stević', 'dobavljac',
   'Slama materijal je dostupan, moguće je naručiti u potrebnim količinama.'),
  ('33333333-3333-3333-3333-333333333337', '55555555-5555-5555-5555-555555555556',
   'Jelena Milić', 'proizvodjac',
   'Denim materijal je odličan izbor, predlog za testiranje različitih nijansi.'),
  ('44444444-4444-4444-4444-444444444447', '66666666-6666-6666-6666-666666666667',
   'Miloš Janković', 'tester_kvaliteta',
   'Oversized fit je odličan, potrebno je proveriti balans siluete.'),
  ('55555555-5555-5555-5555-555555555559', '77777777-7777-7777-7777-777777777778',
   'Sara Petrović', 'proizvodjac',
   'Ribbed tekstura je odličan izbor, predlog za dodatne varijante boja.')
ON CONFLICT (id) DO NOTHING;

-- 8. DODAJ PRODUCT_MODEL_APPROVALS za nove modele

INSERT INTO product_model_approvals (id, model_id, approval_item, status, note)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Materijali', 'approved', 'Odobreno nakon testiranja kvaliteta.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbf', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Krojevi', 'approved', 'Odobreno nakon druge probe.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccf', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Fit test', 'approved', 'Odobreno nakon testiranja.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddf', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Materijali', 'approved', 'Odobreno nakon testiranja kvaliteta.'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'Materijali', 'in_progress', 'Čeka se potvrda dobavljača.'),
  ('ffffffff-ffff-ffff-ffff-fffffffffffe', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'Fit test', 'changes_required', 'Potrebne korekcije u ramenima.'),
  ('11111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111112',
   'Koncept', 'approved', 'Koncept je odobren za dalji razvoj.'),
  ('22222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222223',
   'Materijali', 'approved', 'Lan materijal je odobren.'),
  ('33333333-3333-3333-3333-333333333338', '22222222-2222-2222-2222-222222222223',
   'Fit test', 'approved', 'Odobreno nakon testiranja.'),
  ('44444444-4444-4444-4444-444444444448', '33333333-3333-3333-3333-333333333334',
   'Materijali', 'approved', 'Pamuk materijal je odobren.'),
  ('55555555-5555-5555-5555-55555555555a', '33333333-3333-3333-3333-333333333334',
   'Fit test', 'approved', 'Odobreno nakon testiranja.'),
  ('66666666-6666-6666-6666-66666666666b', '44444444-4444-4444-4444-444444444444',
   'Materijali', 'approved', 'Slama i koža materijali su odobreni.'),
  ('77777777-7777-7777-7777-77777777777c', '55555555-5555-5555-5555-555555555556',
   'Materijali', 'in_progress', 'Čeka se potvrda dobavljača za denim materijal.'),
  ('88888888-8888-8888-8888-88888888888d', '66666666-6666-6666-6666-666666666667',
   'Fit test', 'changes_required', 'Potrebne korekcije u ramenima za oversized fit.'),
  ('99999999-9999-9999-9999-99999999999e', '77777777-7777-7777-7777-777777777778',
   'Materijali', 'approved', 'Pamuk i elastan materijali su odobreni.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf', '77777777-7777-7777-7777-777777777778',
   'Fit test', 'approved', 'Odobreno nakon testiranja.')
ON CONFLICT (id) DO NOTHING;

-- 9. PROVERA - Prikaži statistiku po kolekcijama

SELECT 
    c.id,
    c.name,
    c.collection_type,
    COUNT(pm.id) as total_models,
    COUNT(CASE WHEN pm.development_stage = 'approved' THEN 1 END) as approved_models
FROM collections c
LEFT JOIN product_models pm ON c.id = pm.collection_id
WHERE c.created_by IS NOT NULL
GROUP BY c.id, c.name, c.collection_type
ORDER BY c.created_at DESC;
