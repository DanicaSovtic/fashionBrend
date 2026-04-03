-- Ažuriraj palette (boje) u payload-u tabele product_model_versions na srpski.
-- Dobavljač i izbor količina koriste iste nazive (boja, materijal) na srpskom.

-- 1. navy, white, stripe -> mornarsko plava, bela, prugasto
UPDATE product_model_versions
SET payload = '{"palette": ["mornarsko plava", "bela", "prugasto"], "materials": ["Pamuk 100%"]}'::jsonb
WHERE id = '11111111-1111-1111-1111-111111111113';

-- 2. natural, beige -> prirodna, bež
UPDATE product_model_versions
SET payload = '{"palette": ["prirodna", "bež"], "materials": ["Slama", "Koža"]}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222224';

-- 3. light blue, medium blue, black -> svetlo plava, srednje plava, crna
UPDATE product_model_versions
SET payload = '{"palette": ["svetlo plava", "srednje plava", "crna"], "materials": ["Denim 98% pamuk", "2% elastan"]}'::jsonb
WHERE id = '33333333-3333-3333-3333-333333333335';

-- 4. beige, camel, black -> bež, kamila, crna
UPDATE product_model_versions
SET payload = '{"palette": ["bež", "kamila", "crna"], "materials": ["Viskonza 180g"]}'::jsonb
WHERE id = '44444444-4444-4444-4444-444444444445';

-- 5. white, black, grey -> bela, crna, siva
UPDATE product_model_versions
SET payload = '{"palette": ["bela", "crna", "siva"], "materials": ["Pamuk 95%", "Elastan 5%"]}'::jsonb
WHERE id = '55555555-5555-5555-5555-555555555557';

-- 6. ivory, sky blue -> slonovača, nebesko plava
UPDATE product_model_versions
SET payload = '{"palette": ["slonovača", "nebesko plava"], "materials": ["Organza", "Mrežasti uložak"]}'::jsonb
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';

-- 7. cream, beige, navy -> krem, bež, mornarsko plava
UPDATE product_model_versions
SET payload = '{"palette": ["krem", "bež", "mornarsko plava"], "materials": ["Viskoza 180g", "Elastični pojas"]}'::jsonb
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc';

-- 8. pearl, misty rose, soft lilac -> biserna, mutno ružičasta, meka lila
UPDATE product_model_versions
SET payload = '{"palette": ["biserna", "mutno ružičasta", "meka lila"], "materials": ["Svila 22 momme", "Viskoza postava"]}'::jsonb
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- 9. charcoal, black, camel -> ugalj, crna, kamila
UPDATE product_model_versions
SET payload = '{"palette": ["ugalj", "crna", "kamila"], "materials": ["Vuna 70%", "Poliester 30%"]}'::jsonb
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccd';

-- 10. varijante (bez palette) – ostavljamo pattern/variants, možemo prevesti na srpski
UPDATE product_model_versions
SET payload = '{"pattern": "Dvostruko postavljen rever", "variants": ["Šišano", "Klasično"]}'::jsonb
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- 11. brown, grey, black -> braon, siva, crna
UPDATE product_model_versions
SET payload = '{"palette": ["braon", "siva", "crna"], "materials": ["Tweed 100% vuna"]}'::jsonb
WHERE id = 'dddddddd-dddd-dddd-dddd-ddddddddddde';

-- 12. black, burgundy -> crna, bordo
UPDATE product_model_versions
SET payload = '{"palette": ["crna", "bordo"], "materials": ["Viskonza 200g", "Koža"]}'::jsonb
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef';

-- 13. white, sand, terracotta -> bela, pesak, terakota
UPDATE product_model_versions
SET payload = '{"palette": ["bela", "pesak", "terakota"], "materials": ["Lan 280g"]}'::jsonb
WHERE id = 'ffffffff-ffff-ffff-ffff-fffffffffffe';
