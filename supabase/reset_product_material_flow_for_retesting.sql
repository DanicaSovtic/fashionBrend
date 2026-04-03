-- ============================================================================
-- Reset materijalnog toka, pošiljke, šivenja, lab rezultata i lifecycle događaja
-- za jedan model – da možeš ponovo ceo ciklus (novi bundle = novi shipmentId na lancu).
--
-- PRE pokretanja:
--   1) Zameni 'NLK26-001' SKU-om svog modela (ili koristi blok ispod sa UUID).
--   2) Pokreni u Supabase SQL Editoru (service role / admin).
--   3) Na blockchainu stari shipment i dalje postoji – novi tok MORA ići kroz
--      NOVI zahtev za materijal (novi request_bundle_id) da createShipment ne dobije
--      "Shipment vec postoji" za isti bundle.
--
-- Ovo NE briše: product_models red, products, kolekciju, verzije modela, inventar.
-- ============================================================================

-- --- Varijanta A: po SKU modela ------------------------------------------------
DO $$
DECLARE
  v_model_id uuid;
  v_sku text := 'NLK26-001';  -- <<< PROMENI SKU
BEGIN
  SELECT id INTO v_model_id FROM product_models WHERE sku = v_sku LIMIT 1;

  IF v_model_id IS NULL THEN
    RAISE EXCEPTION 'Model sa SKU % nije pronađen.', v_sku;
  END IF;

  -- 1) Životni ciklus (stranica proizvoda)
  DELETE FROM product_model_lifecycle_events WHERE product_model_id = v_model_id;

  -- 2) Laboratorija
  DELETE FROM lab_test_results WHERE product_model_id = v_model_id;

  -- 3) Nalozi za šivenje (pre pošiljki – shipment_id na orderu postaje NULL ako prvo obrišeš shipment)
  DELETE FROM sewing_orders WHERE product_model_id = v_model_id;

  -- 4) Pošiljke dobavljač → proizvođač (blockchain contract_shipment_id_hex, bundle...)
  DELETE FROM material_shipments WHERE product_model_id = v_model_id;

  -- 5) Zahtevi za materijal (+ request_messages CASCADE na material_request_id)
  DELETE FROM material_requests WHERE product_model_id = v_model_id;

  -- 6) Vrati fazu modela na početak (prilagodi po potrebi: 'idea' ili 'development')
  UPDATE product_models
  SET
    development_stage = 'idea',
    updated_at = now()
  WHERE id = v_model_id;

  RAISE NOTICE 'Reset završen za model_id = % (SKU %)', v_model_id, v_sku;
END $$;

-- --- Varijanta B: samo po product_model UUID (zakomentarisano) ----------------
-- DO $$
-- DECLARE
--   v_model_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';  -- <<< UUID
-- BEGIN
--   DELETE FROM product_model_lifecycle_events WHERE product_model_id = v_model_id;
--   DELETE FROM lab_test_results WHERE product_model_id = v_model_id;
--   DELETE FROM sewing_orders WHERE product_model_id = v_model_id;
--   DELETE FROM material_shipments WHERE product_model_id = v_model_id;
--   DELETE FROM material_requests WHERE product_model_id = v_model_id;
--   UPDATE product_models SET development_stage = 'idea', updated_at = now() WHERE id = v_model_id;
-- END $$;

-- --- Opciono: očisti komentare na modelu (tim / dizajn) -----------------------
-- DELETE FROM product_model_comments WHERE model_id = (
--   SELECT id FROM product_models WHERE sku = 'NLK26-001' LIMIT 1
-- );

-- --- Opciono: odveži proizvod od modela u shopu (ne briše products red) --------
-- UPDATE products
-- SET product_model_id = NULL
-- WHERE product_model_id = (SELECT id FROM product_models WHERE sku = 'NLK26-001' LIMIT 1);
