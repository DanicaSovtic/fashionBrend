-- Loyalty program: Silver, Gold, Platinum
-- Nivoi: pragovi po poenima u poslednjih 12 meseci; multiplikatori 1x, 1.1x, 1.25x

-- 1. Nalozi (jedan red po kupcu)
create table if not exists loyalty_accounts (
  user_id uuid primary key references profiles(user_id) on delete cascade,
  tier text not null default 'silver' check (tier in ('silver', 'gold', 'platinum')),
  points_balance integer not null default 0,
  updated_at timestamp with time zone default now()
);

create index if not exists idx_loyalty_accounts_tier on loyalty_accounts(tier);

-- 2. Događaji (zarada poena pri kupovini, iskoristi pri plaćanju, bonusi)
create table if not exists loyalty_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  points integer not null,
  event_type text not null check (event_type in ('purchase', 'redemption', 'bonus', 'adjustment')),
  created_at timestamp with time zone default now()
);

create index if not exists idx_loyalty_events_user on loyalty_events(user_id);
create index if not exists idx_loyalty_events_order on loyalty_events(order_id);
create index if not exists idx_loyalty_events_created on loyalty_events(created_at);
create index if not exists idx_loyalty_events_type on loyalty_events(event_type);

-- 3. Konfiguracija nivoa (pragovi za poslednjih 12 meseci; multiplier za obračun)
-- Možeš menjati vrednosti prema brendu
create table if not exists loyalty_tier_config (
  tier text primary key check (tier in ('silver', 'gold', 'platinum')),
  min_points_12m integer not null,
  multiplier numeric not null
);

insert into loyalty_tier_config (tier, min_points_12m, multiplier) values
  ('silver', 0, 1),
  ('gold', 500, 1.1),
  ('platinum', 2000, 1.25)
on conflict (tier) do update set
  min_points_12m = excluded.min_points_12m,
  multiplier = excluded.multiplier;

-- Kolona na orders da znamo da li smo već dodelili poene
alter table orders add column if not exists loyalty_points_awarded boolean default false;
-- Iskoristi poena i popust u RSD pri ovoj porudžbini
alter table orders add column if not exists loyalty_points_used integer default 0;
alter table orders add column if not exists loyalty_discount_rsd numeric default 0;

comment on table loyalty_accounts is 'Loyalty nalozi: tier i trenutni saldo poena (za iskoristi)';
comment on table loyalty_events is 'Istorija: purchase = poeni od kupovine (za tier i balance), redemption = iskoristi, bonus/adjustment = ručno';
comment on table loyalty_tier_config is 'Pragovi (poeni u 12 m) i multiplikatori po nivou';

-- RLS: krajnji korisnik vidi samo svoj nalog; marketing_asistent i superadmin vide sve
alter table loyalty_accounts enable row level security;
alter table loyalty_events enable row level security;

-- Kupac vidi samo svoj nalog; backend (service role) piše/čita sve
drop policy if exists "Users see own loyalty account" on loyalty_accounts;
create policy "Users see own loyalty account"
  on loyalty_accounts for select
  using (auth.uid() = user_id);

-- Marketing asistent i superadmin vide sve naloge (za dashboard)
drop policy if exists "Marketing and superadmin can view all loyalty" on loyalty_accounts;
create policy "Marketing and superadmin can view all loyalty"
  on loyalty_accounts for select
  using (
    exists (
      select 1 from profiles p
      where p.user_id = auth.uid()
      and p.role in ('marketing_asistent', 'superadmin')
    )
  );

-- Kupac vidi samo svoje događaje
drop policy if exists "Users see own loyalty events" on loyalty_events;
create policy "Users see own loyalty events"
  on loyalty_events for select
  using (auth.uid() = user_id);

-- Marketing asistent i superadmin vide sve događaje
drop policy if exists "Marketing and superadmin can view all loyalty_events" on loyalty_events;
create policy "Marketing and superadmin can view all loyalty_events"
  on loyalty_events for select
  using (
    exists (
      select 1 from profiles p
      where p.user_id = auth.uid()
      and p.role in ('marketing_asistent', 'superadmin')
    )
  );
