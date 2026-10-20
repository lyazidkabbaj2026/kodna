-- View tracking for Kodna proposals. Run once in the Supabase SQL editor (or as a migration).
-- Visitors can only INSERT events (anon key, row-level security). Nobody can read them except
-- through kodna_stats(key), which checks the secret stats key stored in private.settings.

create extension if not exists pgcrypto;

create table if not exists public.proposal_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  slug       text not null check (slug ~ '^[a-z0-9-]{1,64}$'),
  lang       text check (char_length(lang) <= 5),
  sid        text not null check (char_length(sid) <= 32),
  vid        text check (char_length(vid) <= 32),
  owner      boolean not null default false,
  type       text not null check (type in ('open', 'view', 'play', 'watched', 'pick', 'lang', 'hide', 'show', 'leave')),
  at_ms      integer check (at_ms >= 0),
  page       smallint,
  letter     text check (char_length(letter) <= 2),
  value      integer,
  label      text check (char_length(label) <= 120),
  device     text check (char_length(device) <= 60),
  country    text check (char_length(country) <= 4),
  city       text check (char_length(city) <= 80),
  screen     text check (char_length(screen) <= 20)
);
create index if not exists proposal_events_slug_time on public.proposal_events (slug, created_at desc);

alter table public.proposal_events enable row level security;
drop policy if exists "visitors insert events" on public.proposal_events;
create policy "visitors insert events" on public.proposal_events for insert to anon with check (true);
-- No select policy on purpose.

create schema if not exists private;
revoke all on schema private from anon, authenticated;
create table if not exists private.settings (key text primary key, value text not null);
insert into private.settings (key, value)
  values ('stats_key', encode(gen_random_bytes(18), 'hex'))
  on conflict (key) do nothing;

create or replace function public.kodna_stats(p_key text, p_days int default 90)
returns setof public.proposal_events
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from private.settings s where s.key = 'stats_key' and s.value = p_key) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select e.* from public.proposal_events e
    where e.created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
    order by e.created_at;
end;
$$;
revoke all on function public.kodna_stats(text, int) from public;
grant execute on function public.kodna_stats(text, int) to anon;

-- The stats key to give the dashboard:
--   select value from private.settings where key = 'stats_key';
