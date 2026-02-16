-- Blockchain polja za porudžbine
-- Dual storage: baza + blockchain

alter table orders add column if not exists wallet_address text;
alter table orders add column if not exists tx_hash text;
alter table orders add column if not exists blockchain_network text default 'sepolia';
alter table orders add column if not exists amount_wei text;
alter table orders add column if not exists contract_address text;
alter table orders add column if not exists block_number bigint;
