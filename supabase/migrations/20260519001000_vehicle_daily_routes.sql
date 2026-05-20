alter table public.profiles
  add column if not exists has_vehicle boolean not null default false,
  add column if not exists has_bike boolean not null default false,
  add column if not exists selfie_verification_status text not null default 'not_started'
    check (selfie_verification_status in ('not_started', 'pending', 'verified'));

alter table public.vehicles
  add column if not exists fuel_efficiency_km_per_liter numeric not null default 12
    check (fuel_efficiency_km_per_liter > 0),
  add column if not exists average_gas_price_cents_per_liter int not null default 2400
    check (average_gas_price_cents_per_liter >= 0);

alter table public.ride_offers
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null,
  add column if not exists arrival_time timestamptz not null default now(),
  add column if not exists max_passengers int not null default 1 check (max_passengers > 0),
  add column if not exists distance_meters int not null default 0 check (distance_meters >= 0),
  add column if not exists estimated_gas_cost_cents int not null default 0 check (estimated_gas_cost_cents >= 0),
  add column if not exists cost_per_person_cents int not null default 0 check (cost_per_person_cents >= 0),
  add column if not exists co2_grams int not null default 0 check (co2_grams >= 0),
  add column if not exists co2_savings_grams int not null default 0 check (co2_savings_grams >= 0);

alter table public.ride_requests
  add column if not exists arrival_time timestamptz,
  add column if not exists bike_fallback_requested boolean not null default false;

create policy "open ride requests are readable for matching" on public.ride_requests
  for select to authenticated
  using (status = 'open' or (select auth.uid()) = passenger_id);

create table if not exists public.daily_routes (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  label text not null,
  origin text not null,
  destination text not null,
  days_of_week int[] not null default '{}',
  departure_time time not null,
  arrival_time time not null,
  max_passengers int not null check (max_passengers > 0),
  distance_meters int not null default 0 check (distance_meters >= 0),
  estimated_gas_cost_cents int not null default 0 check (estimated_gas_cost_cents >= 0),
  cost_per_person_cents int not null default 0 check (cost_per_person_cents >= 0),
  co2_grams int not null default 0 check (co2_grams >= 0),
  co2_savings_grams int not null default 0 check (co2_savings_grams >= 0),
  status text not null default 'active'
    check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_route_subscriptions (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.daily_routes(id) on delete cascade,
  passenger_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  pickup_address text not null,
  dropoff_address text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  pickup_offset_meters int not null default 0 check (pickup_offset_meters >= 0),
  dropoff_offset_meters int not null default 0 check (dropoff_offset_meters >= 0),
  estimated_cost_share_cents int not null default 0 check (estimated_cost_share_cents >= 0),
  estimated_co2_savings_grams int not null default 0 check (estimated_co2_savings_grams >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, passenger_id)
);

alter table public.daily_routes enable row level security;
alter table public.daily_route_subscriptions enable row level security;

grant select, insert, update, delete on public.daily_routes to authenticated;
grant select, insert, update, delete on public.daily_route_subscriptions to authenticated;

create policy "active daily routes are readable" on public.daily_routes
  for select to authenticated
  using (status = 'active' or (select auth.uid()) = driver_id);

create policy "drivers manage daily routes" on public.daily_routes
  for insert to authenticated
  with check ((select auth.uid()) = driver_id);

create policy "drivers update daily routes" on public.daily_routes
  for update to authenticated
  using ((select auth.uid()) = driver_id)
  with check ((select auth.uid()) = driver_id);

create policy "route members read subscriptions" on public.daily_route_subscriptions
  for select to authenticated
  using (
    (select auth.uid()) = passenger_id
    or exists (
      select 1
      from public.daily_routes
      where daily_routes.id = daily_route_subscriptions.route_id
        and daily_routes.driver_id = (select auth.uid())
    )
  );

create policy "passengers create own route subscriptions" on public.daily_route_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = passenger_id);

create policy "drivers update route subscriptions" on public.daily_route_subscriptions
  for update to authenticated
  using (
    exists (
      select 1
      from public.daily_routes
      where daily_routes.id = daily_route_subscriptions.route_id
        and daily_routes.driver_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.daily_routes
      where daily_routes.id = daily_route_subscriptions.route_id
        and daily_routes.driver_id = (select auth.uid())
    )
  );
