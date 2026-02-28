-- Jednokratna korekcija: označi SVE materijale u bundle-u Linen Midi Dress kao potvrđene.
-- (Ugovor je prihvatio oba; ranije je samo jedan red bio ažuriran jer contract_shipment_id_hex je bio NULL.)
-- Bundle: 55b7eb55-4ba5-428f-a1cf-7dd7daf2385e
-- Proizvođač: 5ff41f9f-fc66-4810-b040-67da771f47fc

UPDATE material_shipments
SET
  status = 'confirmed',
  confirmed_at = COALESCE(confirmed_at, NOW()),
  received_at = COALESCE(received_at, NOW()),
  updated_at = NOW()
WHERE shipment_bundle_id = '55b7eb55-4ba5-428f-a1cf-7dd7daf2385e'
  AND manufacturer_id = '5ff41f9f-fc66-4810-b040-67da771f47fc';
