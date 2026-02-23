-- Postavlja fazu razvoja (development_stage) na 'idea' za SVE modele
-- OSIM za: Sheer Layered Top (MD-SS26-032) i Denim Wide Leg Jeans (MD-SS26-501)

UPDATE product_models
SET development_stage = 'idea',
    updated_at = now()
WHERE sku IS NULL
   OR sku NOT IN ('MD-SS26-032', 'MD-SS26-501');
