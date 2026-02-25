-- Jedan nalog za šivenje po modelu (više materijala = jedan nalog)
-- Pokrenuti NAKON: add_manufacturer_tables.sql, link_sewing_orders_to_shipments.sql
--
-- Napomena: Ako već postoje dupli nalozi (isti model + proizvođač, new/in_progress),
-- prvo ih objedinite ili obrišite duplikate, pa tek onda pokrenite ovu migraciju.

-- 1. Jedan aktivan nalog po (model, proizvođač) – sprečava duplikate
create unique index if not exists idx_sewing_orders_one_active_per_model_manufacturer
  on sewing_orders (product_model_id, manufacturer_id)
  where status in ('new', 'in_progress');

comment on index idx_sewing_orders_one_active_per_model_manufacturer is
  'Samo jedan nalog za šivenje (new/in_progress) po modelu i proizvođaču; završeni nalozi mogu biti višestruki.';

-- 2. View: modeli spremni za kreiranje naloga (ima bar jedan potvrđen materijal, nema aktivan nalog)
create or replace view manufacturer_models_ready_for_sewing as
select
  ms.product_model_id,
  pm.name as model_name,
  pm.sku as model_sku,
  pm.collection_id,
  c.name as collection_name,
  c.season as collection_season,
  ms.manufacturer_id,
  count(ms.id) filter (where ms.status = 'confirmed') as confirmed_shipments_count,
  count(ms.id) as total_shipments_count
from material_shipments ms
join product_models pm on pm.id = ms.product_model_id
left join collections c on c.id = pm.collection_id
where ms.manufacturer_id is not null
  and ms.product_model_id is not null
group by ms.product_model_id, pm.name, pm.sku, pm.collection_id, c.name, c.season, ms.manufacturer_id
having count(ms.id) filter (where ms.status = 'confirmed') > 0
  and not exists (
    select 1 from sewing_orders so
    where so.product_model_id = ms.product_model_id
      and so.manufacturer_id = ms.manufacturer_id
      and so.status in ('new', 'in_progress')
  );

comment on view manufacturer_models_ready_for_sewing is
  'Modeli za koje proizvođač ima bar jedan potvrđen materijal i još nema aktivan nalog za šivenje.';

-- 3. shipment_id u sewing_orders ostaje opciono (može biti null ili prvi potvrđeni) – ne menjamo strukturu
--    Prikaz svih materijala za nalog ide preko material_shipments.product_model_id + manufacturer_id u API-ju.
