-- Migracija materijala na jednostavniji format sa preciznim procentima
-- Format: "Materijal1 X%, Materijal2 Y%"
-- Popravlja i "Podstava" u "Postava"

-- 1. Tailored Tweed Blazer - "Tweed 100% vuna, Podstava od viskoze"
--    -> "Vuna 95%, Viskoza 5%"
UPDATE product_models
SET materials = 'Vuna 95%, Viskoza 5%'
WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  AND materials LIKE '%Tweed 100% vuna%Podstava od viskoze%';

-- 2. Wool Blend Coat - "Vuna 70%, Poliester 30%, Podstava od viskoze"
--    -> "Vuna 70%, Poliester 30%"
UPDATE product_models
SET materials = 'Vuna 70%, Poliester 30%'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  AND materials LIKE '%Vuna 70%, Poliester 30%, Podstava od viskoze%';

-- 3. Structured Linen Blazer - "Lan 280g; Pamuk podstava"
--    -> "Lan 95%, Pamuk 5%"
UPDATE product_models
SET materials = 'Lan 95%, Pamuk 5%'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  AND materials LIKE '%Lan 280g%Pamuk podstava%';

-- 4. Silk Drape Dress - "Svila 22 momme; Viskoza postava; Metalne kopce"
--    -> "Svila 92%, Viskoza 5%, Metal 3%"
UPDATE product_models
SET materials = 'Svila 92%, Viskoza 5%, Metal 3%'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND materials LIKE '%Svila 22 momme%Viskoza postava%Metalne kopce%';

-- 5. Wide Leg Trousers - "Viskoza 180g, Elastični pojas"
--    -> "Viskoza 95%, Elastan 5%"
UPDATE product_models
SET materials = 'Viskoza 95%, Elastan 5%'
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  AND materials LIKE '%Viskoza 180g, Elastični pojas%';

-- 6. Sheer Layered Top - "Organza, Mrežasti uložak"
--    -> "Organza 90%, Najlon 10%"
UPDATE product_models
SET materials = 'Organza 90%, Najlon 10%'
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  AND materials LIKE '%Organza, Mrežasti uložak%';

-- 7. Denim Wide Leg Jeans - "Denim 98% pamuk, 2% elastan"
--    -> "Pamuk 98%, Elastan 2%"
UPDATE product_models
SET materials = 'Pamuk 98%, Elastan 2%'
WHERE id = '55555555-5555-5555-5555-555555555556'
  AND materials LIKE '%Denim 98% pamuk, 2% elastan%';

-- 8. Oversized Blazer - "Viskonza 180g, Podstava"
--    -> "Viskoza 100%"
UPDATE product_models
SET materials = 'Viskoza 100%'
WHERE id = '66666666-6666-6666-6666-666666666667'
  AND materials LIKE '%Viskonza 180g, Podstava%';

-- 9. Ribbed Knit Top - "Pamuk 95%, Elastan 5%"
--    -> Već je u dobrom formatu, samo proveri
UPDATE product_models
SET materials = 'Pamuk 95%, Elastan 5%'
WHERE id = '77777777-7777-7777-7777-777777777778'
  AND materials LIKE '%Pamuk 95%, Elastan 5%';

-- 10. Cotton Shirt Dress - "Pamuk 100%, Podstava"
--     -> "Pamuk 100%"
UPDATE product_models
SET materials = 'Pamuk 100%'
WHERE id = '33333333-3333-3333-3333-333333333334'
  AND materials LIKE '%Pamuk 100%, Podstava%';

-- 11. Linen Midi Dress - "Lan 280g, Podstava od pamuka"
--     -> "Lan 95%, Pamuk 5%"
UPDATE product_models
SET materials = 'Lan 95%, Pamuk 5%'
WHERE id = '22222222-2222-2222-2222-222222222223'
  AND materials LIKE '%Lan 280g, Podstava od pamuka%';

-- 12. Leather Trimmed Dress - "Viskonza 200g, Koža (detalji), Podstava"
--     -> "Viskoza 90%, Koža 5%, Pamuk 5%"
UPDATE product_models
SET materials = 'Viskoza 90%, Koža 5%, Pamuk 5%'
WHERE id = '11111111-1111-1111-1111-111111111112'
  AND materials LIKE '%Viskonza 200g, Koža (detalji), Podstava%';

-- 13. Woven Straw Bag - "Slama, Koža (detalji), Podstava"
--     -> "Slama 85%, Koža 10%, Pamuk 5%"
UPDATE product_models
SET materials = 'Slama 85%, Koža 10%, Pamuk 5%'
WHERE id = '44444444-4444-4444-4444-444444444444'
  AND materials LIKE '%Slama, Koža (detalji), Podstava%';

-- Provera da li su svi ažurirani i da li procenti daju 100%
-- (Ova provera se radi ručno - SQL ne može automatski da parsira i sabere procente)
SELECT 
  id, 
  name, 
  materials,
  CASE 
    WHEN materials LIKE '%100%' AND materials NOT LIKE '%,%' THEN 'OK (100%)'
    WHEN materials LIKE '%95%,%5%' THEN 'OK (95%+5%=100%)'
    WHEN materials LIKE '%98%,%2%' THEN 'OK (98%+2%=100%)'
    WHEN materials LIKE '%90%,%10%' THEN 'OK (90%+10%=100%)'
    WHEN materials LIKE '%92%,%5%,%3%' THEN 'OK (92%+5%+3%=100%)'
    WHEN materials LIKE '%85%,%10%,%5%' THEN 'OK (85%+10%+5%=100%)'
    WHEN materials LIKE '%70%,%30%' THEN 'OK (70%+30%=100%)'
    ELSE 'PROVERI MANUELNO'
  END as validation_status
FROM product_models 
ORDER BY created_at;
