-- Run in Supabase SQL Editor. Keep the service-role key server-side only.
create table if not exists public.trips (
  id uuid primary key,
  destination text not null,
  departure_date date not null,
  duration integer not null check (duration between 1 and 21),
  budget numeric not null check (budget > 0),
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  itinerary jsonb not null,
  payload jsonb not null
);

alter table public.trips enable row level security;
-- This app accesses the table from FastAPI with a server-side service-role key.
-- Do not expose that key to the browser. For public production deployments, add auth
-- and user-scoped policies before allowing end users to store private trips.
