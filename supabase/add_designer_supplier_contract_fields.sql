-- Zahtev za materijal: jedan logički zahtev (bundle) = više materijala = jedan requestId u ugovoru
-- Dizajner šalje zahtev za 2+ materijala; svi redovi dele isti request_bundle_id.

-- 1. Polja na material_requests za grupisane zahteve i blockchain
alter table material_requests add column if not exists request_bundle_id uuid;
alter table material_requests add column if not exists contract_address text;
alter table material_requests add column if not exists contract_request_id_hex text;
alter table material_requests add column if not exists fund_tx_hash text;

create index if not exists idx_material_requests_bundle on material_requests(request_bundle_id);

comment on column material_requests.request_bundle_id is 'Istí UUID za sve redove jednog zahteva (2+ materijala). requestId u ugovoru = keccak256(bundle_id).';
comment on column material_requests.contract_address is 'Adresa DesignerSupplierContract-a kada je zahtev deponovan na blockchainu.';
comment on column material_requests.contract_request_id_hex is 'bytes32 requestId u hex za poziv acceptRequest.';

-- 2. Wallet adresa u profilima (dizajner/dobavljač za blockchain)
alter table profiles add column if not exists wallet_address text;
comment on column profiles.wallet_address is 'Ethereum adresa za blockchain (MetaMask). Koristi se za DesignerSupplierContract.';
