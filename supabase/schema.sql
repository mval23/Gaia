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
