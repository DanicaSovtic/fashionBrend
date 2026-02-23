-- Uklanja proizvod MD-SS26-502 (Oversized Blazer) iz prodavnice
-- tako da ga više nema u prodaji; posle možeš ponovo kliknuti "Pusti u prodaju".

-- 1. Ukloni iz korpe i favorita (inace DELETE na products može da pukne na FK)
DELETE FROM cart_items
WHERE product_id = (
  SELECT id FROM products
  WHERE product_model_id = (SELECT id FROM product_models WHERE sku = 'MD-SS26-502' LIMIT 1)
  LIMIT 1
);

DELETE FROM favorites
WHERE product_id = (
  SELECT id FROM products
  WHERE product_model_id = (SELECT id FROM product_models WHERE sku = 'MD-SS26-502' LIMIT 1)
  LIMIT 1
);

-- 2. Obriši proizvod iz prodavnice (ako ima order_items za ovaj product_id, DELETE ce javiti grešku – tada proizvod ostaje zbog istorije porudžbina)
DELETE FROM products
WHERE product_model_id = (
  SELECT id FROM product_models WHERE sku = 'MD-SS26-502' LIMIT 1
);
