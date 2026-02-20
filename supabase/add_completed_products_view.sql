-- SQL migracija za prikaz završenih proizvoda od proizvođača za modnog dizajnera
-- Kreira view koji prikazuje završene naloge za šivenje sa informacijama o modelu i materijalu

-- View za završene proizvode od proizvođača
create or replace view completed_products_from_manufacturer as
select 
  so.id as sewing_order_id,
  so.product_model_id,
  so.collection_id,
  so.model_name,
  so.model_sku,
  so.quantity_pieces,
  so.deadline,
  so.completed_at,
  so.proof_document_url,
  pm.development_stage,
  pm.name as product_model_name,
  pm.sku as product_model_sku,
  c.name as collection_name,
  c.season as collection_season,
  c.created_by as designer_id, -- Dizajner koji je kreirao kolekciju
  ms.material,
  ms.color,
  ms.quantity_sent_kg,
  ms.status as material_status,
  ms.confirmed_at as material_confirmed_at,
  mr.requested_by as material_requested_by, -- Dizajner koji je tražio materijal (može biti različit)
  mr.notes as designer_notes,
  p.id as product_id, -- Ako je već kreiran products zapis
  p.title as product_title
from sewing_orders so
inner join product_models pm on pm.id = so.product_model_id
left join collections c on c.id = so.collection_id
left join material_shipments ms on ms.id = so.shipment_id
left join material_requests mr on mr.id = ms.material_request_id
left join products p on p.product_model_id = so.product_model_id
where so.status = 'completed'
  and c.created_by is not null; -- Samo za modele iz kolekcija koje je dizajner kreirao

-- Komentar za dokumentaciju
comment on view completed_products_from_manufacturer is 'Završeni proizvodi od proizvođača koje dizajner može pustiti u prodaju';

-- Indeksi za performanse (ako već ne postoje)
create index if not exists idx_sewing_orders_completed on sewing_orders(status, completed_at) where status = 'completed';
create index if not exists idx_material_shipments_confirmed on material_shipments(status, confirmed_at) where status = 'confirmed';
