-- Personal sync for أدرك عمرك (adrik-personal ↔ adrik-mobile).
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
-- One row per saved store (slot) per signed-in user. Only the owner can read or write their rows.

create table if not exists public.adrik_sync (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  slot       text        not null check (slot in ('main', 'vault', 'planner', 'projects')),
  data       jsonb       not null,
  device     text,
  updated_at timestamptz not null default now(),
  primary key (owner, slot)
);

alter table public.adrik_sync enable row level security;

-- Exposed to signed-in users only, and only what the apps use; the anon role gets nothing.
-- (Revoking from authenticated too clears Supabase's default grants such as TRUNCATE.)
revoke all on table public.adrik_sync from anon, authenticated;
grant select, insert, update on table public.adrik_sync to authenticated;

drop policy if exists "owner reads" on public.adrik_sync;
create policy "owner reads" on public.adrik_sync
  for select to authenticated
  using ((select auth.uid()) = owner);

drop policy if exists "owner inserts" on public.adrik_sync;
create policy "owner inserts" on public.adrik_sync
  for insert to authenticated
  with check ((select auth.uid()) = owner);

drop policy if exists "owner updates" on public.adrik_sync;
create policy "owner updates" on public.adrik_sync
  for update to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

-- The server's clock stamps every write, so the apps can tell whether a row changed since they last saw it.
create or replace function public.adrik_sync_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.adrik_sync_touch() from public, anon, authenticated;

drop trigger if exists adrik_sync_touch on public.adrik_sync;
create trigger adrik_sync_touch
  before insert or update on public.adrik_sync
  for each row execute function public.adrik_sync_touch();
