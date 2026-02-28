-- Polja za povezivanje material_shipments sa SupplierManufacturerContract (blockchain)
-- shipment_bundle_id = isti UUID za sve redove jedne pošiljke (bundle); shipmentId u ugovoru = keccak256(shipment_bundle_id)

alter table material_shipments add column if not exists contract_address text;
alter table material_shipments add column if not exists contract_shipment_id_hex text;
alter table material_shipments add column if not exists shipment_bundle_id uuid;

create index if not exists idx_material_shipments_shipment_bundle on material_shipments(shipment_bundle_id);
create index if not exists idx_material_shipments_contract_shipment on material_shipments(contract_shipment_id_hex) where contract_shipment_id_hex is not null;

comment on column material_shipments.contract_address is 'Adresa SupplierManufacturerContract-a kada je pošiljka kreirana na blockchainu.';
comment on column material_shipments.contract_shipment_id_hex is 'bytes32 shipmentId u hex (keccak256(shipment_bundle_id)) za acceptShipment/rejectShipment.';
comment on column material_shipments.shipment_bundle_id is 'Isti UUID za sve redove jedne grupne pošiljke (bundle). Koristi se za shipmentId u ugovoru.';
