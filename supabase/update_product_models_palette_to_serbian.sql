-- Frontend prikazuje product_models.color_palette i product_models.materials,
-- NE product_model_versions.payload. Zato paleta mora biti na srpskom i ovde.

-- Sheer Layered Top
UPDATE product_models SET color_palette = 'slonovača, nebesko plava' WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Wide Leg Trousers
UPDATE product_models SET color_palette = 'krem, bež, mornarsko plava' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Wool Blend Coat
UPDATE product_models SET color_palette = 'ugalj, crna, kamila' WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- Tailored Tweed Blazer
UPDATE product_models SET color_palette = 'braon, siva, crna' WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

-- Leather Trimmed Dress
UPDATE product_models SET color_palette = 'crna, bordo' WHERE id = '11111111-1111-1111-1111-111111111112';

-- Linen Midi Dress
UPDATE product_models SET color_palette = 'bela, pesak, terakota' WHERE id = '22222222-2222-2222-2222-222222222223';

-- Cotton Shirt Dress
UPDATE product_models SET color_palette = 'mornarsko plava, bela, prugasto' WHERE id = '33333333-3333-3333-3333-333333333334';

-- Woven Straw Bag
UPDATE product_models SET color_palette = 'prirodna, bež' WHERE id = '44444444-4444-4444-4444-444444444444';

-- Denim Wide Leg Jeans
UPDATE product_models SET color_palette = 'svetlo plava, srednje plava, crna' WHERE id = '55555555-5555-5555-5555-555555555556';

-- Oversized Blazer
UPDATE product_models SET color_palette = 'bež, kamila, crna' WHERE id = '66666666-6666-6666-6666-666666666667';

-- Ribbed Knit Top
UPDATE product_models SET color_palette = 'bela, crna, siva' WHERE id = '77777777-7777-7777-7777-777777777778';

-- Silk Drape Dress (iz schema.sql)
UPDATE product_models SET color_palette = 'biserna, mutno ružičasta, meka lila' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Structured Linen Blazer (iz schema.sql: sand, olive, chalk)
UPDATE product_models SET color_palette = 'pesak, maslinasta, kreda' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
