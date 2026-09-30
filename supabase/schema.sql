-- Gaia: one planner per account, stored as JSON.
-- Run this once in your Supabase project (SQL Editor -> New query -> Run).

create table if not exists public.planners (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row-level security is what keeps each person's planner private:
-- the public key in the app can only ever reach the signed-in person's row.
alter table public.planners enable row level security;

drop policy if exists "Read own planner" on public.planners;
create policy "Read own planner" on public.planners
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Create own planner" on public.planners;
create policy "Create own planner" on public.planners
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own planner" on public.planners;
create policy "Update own planner" on public.planners
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Notifications: one row per phone (or browser) that turned them on.
-- Safe to run again on a project that already has the planners table.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  -- The phone's own time zone, so "21:30" means 21:30 where the phone is.
  time_zone  text not null default 'UTC',
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Read own phones" on public.push_subscriptions;
create policy "Read own phones" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Add own phones" on public.push_subscriptions;
create policy "Add own phones" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own phones" on public.push_subscriptions;
create policy "Update own phones" on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Remove own phones" on public.push_subscriptions;
create policy "Remove own phones" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- What the reminder server has already sent, so nothing is sent twice.
-- No policies: only the server (with the secret key) reads or writes it.
create table if not exists public.push_sent (
  endpoint text not null references public.push_subscriptions (endpoint) on delete cascade,
  key      text not null,
  sent_at  timestamptz not null default now(),
  primary key (endpoint, key)
);

alter table public.push_sent enable row level security;
