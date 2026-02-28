-- Ručno dodavanje pošiljke za bundle 55b7eb55 (Linen Midi Dress – Pamuk + Lan)
-- koja nije upisana jer migracija nije bila pokrenuta pri prvom slanju.
-- Proizvođač: 5ff41f9f-fc66-4810-b040-67da771f47fc

INSERT INTO material_shipments (
  material_request_id,
  product_model_id,
  collection_id,
  supplier_id,
  manufacturer_id,
  model_name,
  model_sku,
  material,
  color,
  quantity_kg,
  quantity_sent_kg,
  shipping_date,
  tracking_number,
  status,
  contract_address,
  contract_shipment_id_hex,
  shipment_bundle_id
)
SELECT
  id,
  product_model_id,
  collection_id,
  supplier_id,
  '5ff41f9f-fc66-4810-b040-67da771f47fc'::uuid,
  model_name,
  model_sku,
  material,
  color,
  quantity_kg,
  quantity_kg,
  NULL,
  NULL,
  'sent_to_manufacturer',
  '0x02F7135E94356ff4c95832e43476ed101Ff2EADd',
  NULL,
  request_bundle_id
FROM material_requests
WHERE request_bundle_id = '55b7eb55-4ba5-428f-a1cf-7dd7daf2385e';
