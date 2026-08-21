-- Migration: 20260821120000_ludo_rooms.sql
-- Multiplayer Ludo Game Rooms table and RLS policies

create table if not exists public.ludo_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_id text not null,
  host_name text not null default 'Host Player',
  guest_id text,
  guest_name text,
  status text not null default 'waiting',
  game_state jsonb not null default '{}'::jsonb,
  last_action jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.ludo_rooms enable row level security;

-- Open policies for casual game rooms
drop policy if exists "Allow all read on ludo_rooms" on public.ludo_rooms;
create policy "Allow all read on ludo_rooms" on public.ludo_rooms for select using (true);

drop policy if exists "Allow all insert on ludo_rooms" on public.ludo_rooms;
create policy "Allow all insert on ludo_rooms" on public.ludo_rooms for insert with check (true);

drop policy if exists "Allow all update on ludo_rooms" on public.ludo_rooms;
create policy "Allow all update on ludo_rooms" on public.ludo_rooms for update using (true);

drop policy if exists "Allow all delete on ludo_rooms" on public.ludo_rooms;
create policy "Allow all delete on ludo_rooms" on public.ludo_rooms for delete using (true);
