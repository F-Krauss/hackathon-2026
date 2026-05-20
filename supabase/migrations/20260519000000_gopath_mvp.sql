create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  phone text,
  default_preference text not null default 'balanced'
    check (default_preference in ('fastest', 'cheapest', 'greenest', 'balanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  seats int not null check (seats between 1 and 8),
  fuel_type text not null default 'gasoline'
    check (fuel_type in ('gasoline', 'hybrid', 'electric')),
  created_at timestamptz not null default now()
);

create table if not exists public.route_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  origin text not null,
  destination text not null,
  preference text not null default 'balanced'
    check (preference in ('fastest', 'cheapest', 'greenest', 'balanced')),
  recommended_option_id text,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  origin text not null,
  destination text not null,
  departure_time timestamptz not null,
  seats_available int not null check (seats_available > 0),
  price_per_seat_cents int not null default 0 check (price_per_seat_cents >= 0),
  status text not null default 'open'
    check (status in ('draft', 'open', 'matched', 'cancelled')),
  route_estimate_id uuid references public.route_estimates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  origin text not null,
  destination text not null,
  departure_time timestamptz not null,
  seats_needed int not null default 1 check (seats_needed > 0),
  preference text not null default 'balanced'
    check (preference in ('fastest', 'cheapest', 'greenest', 'balanced')),
  status text not null default 'open'
    check (status in ('open', 'matched', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carpools (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.ride_offers(id) on delete cascade,
  request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  passenger_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offer_id, request_id)
);

create table if not exists public.carpool_members (
  id uuid primary key default gen_random_uuid(),
  carpool_id uuid not null references public.carpools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('driver', 'passenger')),
  created_at timestamptz not null default now(),
  unique (carpool_id, user_id)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  carpool_id uuid references public.carpools(id) on delete set null,
  origin text not null,
  destination text not null,
  mode text not null check (mode in ('driving', 'transit', 'walking', 'cycling', 'carpool')),
  distance_meters int not null default 0,
  duration_seconds int not null default 0,
  cost_cents int not null default 0,
  carbon_grams int not null default 0,
  co2_savings_grams int not null default 0,
  completed_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  label text not null,
  points int not null default 0,
  reason text not null,
  earned_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.route_estimates enable row level security;
alter table public.ride_offers enable row level security;
alter table public.ride_requests enable row level security;
alter table public.carpools enable row level security;
alter table public.carpool_members enable row level security;
alter table public.trips enable row level security;
alter table public.rewards enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.route_estimates to authenticated;
grant select, insert, update, delete on public.ride_offers to authenticated;
grant select, insert, update, delete on public.ride_requests to authenticated;
grant select, insert, update, delete on public.carpools to authenticated;
grant select, insert, update, delete on public.carpool_members to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.rewards to authenticated;
grant select on public.ride_offers to anon;

create policy "profiles are owned by user" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "vehicles are owned by user" on public.vehicles
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "route estimates are owned by user" on public.route_estimates
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "open ride offers are readable" on public.ride_offers
  for select to anon, authenticated
  using (status = 'open' or (select auth.uid()) = driver_id);

create policy "drivers manage own ride offers" on public.ride_offers
  for insert to authenticated
  with check ((select auth.uid()) = driver_id);

create policy "drivers update own ride offers" on public.ride_offers
  for update to authenticated
  using ((select auth.uid()) = driver_id)
  with check ((select auth.uid()) = driver_id);

create policy "passengers manage own ride requests" on public.ride_requests
  for all to authenticated
  using ((select auth.uid()) = passenger_id)
  with check ((select auth.uid()) = passenger_id);

create policy "carpool members can read carpools" on public.carpools
  for select to authenticated
  using ((select auth.uid()) in (driver_id, passenger_id));

create policy "carpool members can create carpools" on public.carpools
  for insert to authenticated
  with check ((select auth.uid()) in (driver_id, passenger_id));

create policy "carpool members can update carpools" on public.carpools
  for update to authenticated
  using ((select auth.uid()) in (driver_id, passenger_id))
  with check ((select auth.uid()) in (driver_id, passenger_id));

create policy "carpool members can read membership" on public.carpool_members
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can create own membership" on public.carpool_members
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "trips are owned by user" on public.trips
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "rewards are owned by user" on public.rewards
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
