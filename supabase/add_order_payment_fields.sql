-- Add payment method and additional recipient fields to orders table

-- Add payment_method column
alter table orders add column if not exists payment_method text;

-- Add recipient_email column
alter table orders add column if not exists recipient_email text;

-- Add recipient_street column
alter table orders add column if not exists recipient_street text;

-- Add recipient_address_details column (for ulaz, stan, etc.)
alter table orders add column if not exists recipient_address_details text;

-- Add user_id column to link orders to users
alter table orders add column if not exists user_id uuid references profiles(user_id) on delete set null;
