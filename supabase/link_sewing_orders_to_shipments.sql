-- SQL migracija za povezivanje sewing_orders sa material_shipments
-- i automatsko kreiranje naloga za šivenje kada se potvrdi prijem materijala

-- 1. Dodaj shipment_id kolonu u sewing_orders
alter table sewing_orders 
  add column if not exists shipment_id uuid references material_shipments(id) on delete set null;

create index if not exists idx_sewing_orders_shipment on sewing_orders(shipment_id);

-- 2. Dodaj kolonu za materijal status u sewing_orders (za brzo prikazivanje)
alter table sewing_orders
  add column if not exists material_status text default 'waiting';

alter table sewing_orders
  add constraint sewing_orders_material_status_check check (
    material_status in ('waiting', 'ready')
  );

-- 3. Funkcija za ažuriranje material_status u sewing_orders kada se promeni status shipment-a
-- Napomena: Kreiranje sewing_order-a će se raditi direktno iz backend-a kada se potvrdi shipment
-- jer treba da se prosleđuje quantity_pieces iz frontenda
create or replace function update_sewing_order_material_status()
returns trigger as $$
begin
  -- Ažuriraj material_status u postojećim nalozima kada se promeni status shipment-a
  if NEW.status = 'confirmed' then
    update sewing_orders
    set material_status = 'ready'
    where shipment_id = NEW.id;
  elsif NEW.status in ('sent_to_manufacturer', 'received') then
    update sewing_orders
    set material_status = 'waiting'
    where shipment_id = NEW.id;
  end if;

  return NEW;
end;
$$ language plpgsql;

-- 4. Trigger koji se okida kada se ažurira material_shipments
drop trigger if exists trigger_update_sewing_order_material_status on material_shipments;
create trigger trigger_update_sewing_order_material_status
  after update on material_shipments
  for each row
  execute function update_sewing_order_material_status();

-- 5. Komentar za dokumentaciju
comment on column sewing_orders.shipment_id is 'Veza sa material_shipments - pošiljka materijala za ovaj nalog';
comment on column sewing_orders.material_status is 'Status materijala: waiting (čeka materijal) ili ready (spreman)';
