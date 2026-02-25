-- Popuni product_model_lifecycle_events iz postojećih podataka (što više moguće).
-- Pokrenuti NAKON product_lifecycle_tables.sql.
-- Koristi product_models, sewing_orders, lab_test_results, material_shipments, products.

-- 1) Idea – datum kreiranja modela
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  pm.id,
  'idea',
  'Kreiranje ideje i modela',
  pm.created_at,
  'Model kreiran od strane modnog dizajnera.',
  1
from product_models pm
where pm.development_stage = 'approved'
  and not exists (
    select 1 from product_model_lifecycle_events e
    where e.product_model_id = pm.id and e.step_key = 'idea'
  );

-- 2) Development – ažuriranje modela (ako je updated_at > created_at)
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  pm.id,
  'development',
  'Razvoj i odobrenje za proizvodnju',
  pm.updated_at,
  'Razvoj modela i odobrenje za proizvodnju.',
  2
from product_models pm
where pm.development_stage = 'approved'
  and pm.updated_at is not null
  and pm.updated_at > pm.created_at
  and not exists (
    select 1 from product_model_lifecycle_events e
    where e.product_model_id = pm.id and e.step_key = 'development'
  );

-- 3) Material confirmed – najraniji confirmed_at za material_shipments za taj model (jedan po modelu)
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  ms.product_model_id,
  'material_confirmed',
  'Potvrda i isporuka materijala',
  ms.confirmed_at,
  'Materijal potvrđen i isporučen proizvođaču.',
  3
from (
  select distinct on (product_model_id) product_model_id, confirmed_at
  from material_shipments
  where product_model_id is not null and confirmed_at is not null
  order by product_model_id, confirmed_at asc
) ms
where not exists (
  select 1 from product_model_lifecycle_events e
  where e.product_model_id = ms.product_model_id and e.step_key = 'material_confirmed'
);

-- 4) Production started – najraniji started_at iz sewing_orders (jedan po modelu)
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  so.product_model_id,
  'production_started',
  'Početak proizvodnje',
  so.started_at,
  'Započeta proizvodnja u radnji.',
  4
from (
  select distinct on (product_model_id) product_model_id, started_at
  from sewing_orders where started_at is not null
  order by product_model_id, started_at asc
) so
where not exists (
  select 1 from product_model_lifecycle_events e
  where e.product_model_id = so.product_model_id and e.step_key = 'production_started'
);

-- 5) Production completed – najraniji completed_at iz sewing_orders (jedan po modelu)
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  so.product_model_id,
  'production_completed',
  'Završena proizvodnja',
  so.completed_at,
  'Proizvodnja završena i proizvod spreman za kontrolu.',
  5
from (
  select distinct on (product_model_id) product_model_id, completed_at
  from sewing_orders where status = 'completed' and completed_at is not null
  order by product_model_id, completed_at asc
) so
where not exists (
  select 1 from product_model_lifecycle_events e
  where e.product_model_id = so.product_model_id and e.step_key = 'production_completed'
);

-- 6) Quality control – najraniji lab test za model (jedan događaj po modelu)
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  ltr.product_model_id,
  'quality_control',
  'Kontrola kvaliteta',
  ltr.created_at,
  'Laboratorijski test kvaliteta materijala i proizvoda.',
  6
from (
  select distinct on (product_model_id) product_model_id, created_at
  from lab_test_results
  order by product_model_id, created_at asc
) ltr
where not exists (
  select 1 from product_model_lifecycle_events e
  where e.product_model_id = ltr.product_model_id and e.step_key = 'quality_control'
);

-- 7) Packaged – ako nemamo eksplicitno, koristimo completed_at iz sewing_orders kao proxy (opciono, već imamo production_completed)
-- Preskačemo da ne dupliramo; ako imate posebnu tabelu za pakovanje, dodajte insert ovde.

-- 8) Added to shop – najraniji created_at iz products za taj model (jedan po modelu)
insert into product_model_lifecycle_events (product_model_id, step_key, step_label_sr, occurred_at, description, sort_order)
select
  p.product_model_id,
  'added_to_shop',
  'Dodato u prodavnicu',
  p.created_at,
  'Proizvod je dodat u prodavnicu i dostupan kupcima.',
  8
from (
  select distinct on (product_model_id) product_model_id, created_at
  from products where product_model_id is not null
  order by product_model_id, created_at asc
) p
where not exists (
  select 1 from product_model_lifecycle_events e
  where e.product_model_id = p.product_model_id and e.step_key = 'added_to_shop'
);
