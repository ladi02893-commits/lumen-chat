-- Lumen private-chat schema for InsForge PostgreSQL.
-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.friend_request_status as enum ('pending','accepted','rejected','cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.message_kind as enum ('TEXT','EMOJI','IMAGE','VIDEO','AUDIO','DOCUMENT','LOCATION','LINK','SYSTEM');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.auto_delete_mode as enum ('never','24h','12h','3h','5m_after_view','instant_after_view','custom');
exception when duplicate_object then null;
end $$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check(char_length(full_name) between 2 and 80),
  username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'),
  email text not null,
  avatar_url text,
  bio text check(char_length(bio) <= 280),
  phone_optional text,
  country_optional text,
  status_text text check(char_length(status_text) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  is_online boolean not null default false
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(sender_id <> receiver_id)
);

create unique index if not exists unique_pending_request_pair 
  on public.friend_requests(least(sender_id, receiver_id), greatest(sender_id, receiver_id)) 
  where status = 'pending';

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check(user_id < friend_id),
  unique(user_id, friend_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check(type = 'direct'),
  auto_delete_mode public.auto_delete_mode not null default 'never',
  auto_delete_seconds integer check(auto_delete_seconds between 5 and 604800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  cleared_at timestamptz,
  unique(conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message_type public.message_kind not null,
  content text,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  viewed_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  expires_at timestamptz,
  reply_to_message_id uuid references public.messages(id),
  check (
    (message_type in ('TEXT','EMOJI','LINK','SYSTEM') and content is not null) or 
    message_type not in ('TEXT','EMOJI','LINK','SYSTEM')
  )
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check(file_size > 0),
  thumbnail_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(message_id, user_id)
);

create table if not exists public.typing_status (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system' check(theme in ('light','dark','system')),
  show_presence boolean not null default true,
  show_last_seen boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_name_search_idx on public.profiles(lower(full_name));
create index if not exists requests_receiver_status_idx on public.friend_requests(receiver_id, status);
create index if not exists friendships_user_idx on public.friendships(user_id, friend_id);
create index if not exists members_user_idx on public.conversation_members(user_id);
create index if not exists messages_conversation_cursor_idx on public.messages(conversation_id, created_at desc);
create index if not exists messages_expiry_idx on public.messages(expires_at) where deleted_at is null;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- Functions & Helpers
create or replace function public.my_profile_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.friendships where user_id = least(a, b) and friend_id = greatest(a, b));
$$;

create or replace function public.is_member(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_members where conversation_id = c and user_id = public.my_profile_id());
$$;

-- Friend request mutations
create or replace function public.send_friend_request(receiver uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare
  mine uuid := public.my_profile_id();
  req uuid;
begin
  if mine is null or mine = receiver then
    raise exception 'invalid friend request';
  end if;

  if public.are_friends(mine, receiver) then
    raise exception 'already friends';
  end if;

  if exists(
    select 1 from public.friend_requests 
    where status = 'pending' 
      and least(sender_id, receiver_id) = least(mine, receiver) 
      and greatest(sender_id, receiver_id) = greatest(mine, receiver)
  ) then
    raise exception 'request already pending';
  end if;

  if (select count(*) from public.friend_requests where sender_id = mine and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'request rate limit exceeded';
  end if;

  insert into public.friend_requests(sender_id, receiver_id)
  values (mine, receiver)
  returning id into req;

  insert into public.notifications(user_id, kind, title, data)
  values (receiver, 'friend_request', 'New friend request', jsonb_build_object('request_id', req));

  return req;
end;
$$;

create or replace function public.respond_friend_request(request_id uuid, accept boolean) returns uuid language plpgsql security definer set search_path = public as $$
declare
  r public.friend_requests;
  c uuid;
begin
  select * into r 
  from public.friend_requests 
  where id = request_id and receiver_id = public.my_profile_id() and status = 'pending' 
  for update;

  if not found then
    raise exception 'request not found';
  end if;

  update public.friend_requests 
  set status = case when accept then 'accepted'::public.friend_request_status else 'rejected'::public.friend_request_status end,
      updated_at = now() 
  where id = r.id;

  if not accept then
    return null;
  end if;

  insert into public.friendships(user_id, friend_id)
  values (least(r.sender_id, r.receiver_id), greatest(r.sender_id, r.receiver_id))
  on conflict do nothing;

  -- Check if conversation already exists between the two
  select conversation_id into c
  from public.conversation_members cm1
  join public.conversation_members cm2 using (conversation_id)
  where cm1.user_id = r.sender_id and cm2.user_id = r.receiver_id
  limit 1;

  if c is null then
    insert into public.conversations default values returning id into c;
    insert into public.conversation_members(conversation_id, user_id)
    values (c, r.sender_id), (c, r.receiver_id);
  end if;

  insert into public.notifications(user_id, kind, title, data)
  values (r.sender_id, 'friend_accepted', 'Friend request accepted', jsonb_build_object('conversation_id', c));

  return c;
end;
$$;

-- Create Message mutation
create or replace function public.create_message(
  c uuid, 
  kind public.message_kind, 
  body text default null, 
  lat numeric default null, 
  lng numeric default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  m uuid;
  sender uuid := public.my_profile_id();
  expiration timestamptz;
  mode public.auto_delete_mode;
  seconds integer;
begin
  if not public.is_member(c) then
    raise exception 'not a conversation member';
  end if;

  if length(coalesce(body, '')) > 5000 then
    raise exception 'message too long';
  end if;

  if (select count(*) from public.messages where sender_id = sender and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'message rate limit exceeded';
  end if;

  select auto_delete_mode, auto_delete_seconds into mode, seconds from public.conversations where id = c;

  expiration := case mode
    when '24h' then now() + interval '24 hours'
    when '12h' then now() + interval '12 hours'
    when '3h' then now() + interval '3 hours'
    when 'custom' then now() + make_interval(secs => coalesce(seconds, 86400))
    else null
  end;

  insert into public.messages(conversation_id, sender_id, message_type, content, location_lat, location_lng, expires_at)
  values (c, sender, kind, body, lat, lng, expiration)
  returning id into m;

  update public.conversations set updated_at = now() where id = c;

  return m;
end;
$$;

-- Set Conversation Auto-Delete Mode & Custom Seconds
create or replace function public.set_conversation_auto_delete(
  c uuid, 
  mode public.auto_delete_mode, 
  secs integer default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(c) then
    raise exception 'not a conversation member';
  end if;

  update public.conversations
  set auto_delete_mode = mode,
      auto_delete_seconds = secs,
      updated_at = now()
  where id = c;
end;
$$;

-- Clear chat history for the calling user
create or replace function public.clear_conversation(c uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(c) then
    raise exception 'not a conversation member';
  end if;

  update public.conversation_members
  set cleared_at = now()
  where conversation_id = c and user_id = public.my_profile_id();
end;
$$;

-- Mark message viewed & trigger view-based auto-delete expiration
create or replace function public.mark_message_viewed(m_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  m public.messages;
  mode public.auto_delete_mode;
  new_exp timestamptz;
  my_id uuid := public.my_profile_id();
begin
  select * into m from public.messages where id = m_id;
  if not found then return null; end if;
  if not public.is_member(m.conversation_id) then return null; end if;

  -- Record read
  insert into public.message_reads (message_id, user_id, read_at)
  values (m_id, my_id, now())
  on conflict (message_id, user_id) do update set read_at = now();

  -- If message was sent by other user and not yet marked viewed
  if m.sender_id <> my_id and m.viewed_at is null then
    select auto_delete_mode into mode from public.conversations where id = m.conversation_id;

    if mode = 'instant_after_view' then
      new_exp := now() + interval '5 seconds';
    elsif mode = '5m_after_view' then
      new_exp := now() + interval '5 minutes';
    else
      new_exp := m.expires_at;
    end if;

    update public.messages
    set viewed_at = now(),
        expires_at = coalesce(new_exp, expires_at)
    where id = m_id;
  end if;

  return now();
end;
$$;

-- Typing status mutation
create or replace function public.set_typing(c uuid, typing boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  my_id uuid := public.my_profile_id();
begin
  if not public.is_member(c) then
    raise exception 'not a conversation member';
  end if;

  insert into public.typing_status (conversation_id, user_id, is_typing, updated_at)
  values (c, my_id, typing, now())
  on conflict (conversation_id, user_id) do update set
    is_typing = typing,
    updated_at = now();
end;
$$;

-- Update presence
create or replace function public.update_presence(online boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  my_id uuid := public.my_profile_id();
begin
  if my_id is not null then
    update public.profiles
    set is_online = online,
        last_seen_at = now(),
        updated_at = now()
    where id = my_id;
  end if;
end;
$$;

-- Expire messages
create or replace function public.expire_messages() returns setof uuid language plpgsql security definer set search_path = public as $$
begin
  return query 
  update public.messages 
  set deleted_at = now() 
  where expires_at <= now() and deleted_at is null 
  returning id;
end;
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reads enable row level security;
alter table public.typing_status enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;

-- Drop existing policies if re-running
drop policy if exists profile_read on public.profiles;
drop policy if exists profile_update on public.profiles;
drop policy if exists profile_insert on public.profiles;
drop policy if exists request_read on public.friend_requests;
drop policy if exists request_insert on public.friend_requests;
drop policy if exists request_update on public.friend_requests;
drop policy if exists friendship_read on public.friendships;
drop policy if exists convo_read on public.conversations;
drop policy if exists convo_update on public.conversations;
drop policy if exists members_read on public.conversation_members;
drop policy if exists members_update on public.conversation_members;
drop policy if exists message_read on public.messages;
drop policy if exists attachment_read on public.message_attachments;
drop policy if exists attachment_insert on public.message_attachments;
drop policy if exists message_reads_select on public.message_reads;
drop policy if exists message_reads_insert on public.message_reads;
drop policy if exists message_reads_update on public.message_reads;
drop policy if exists typing_status_select on public.typing_status;
drop policy if exists typing_status_modify on public.typing_status;
drop policy if exists notification_owner on public.notifications;
drop policy if exists setting_owner on public.user_settings;

-- Policies
create policy profile_read on public.profiles 
  for select to authenticated using (true);

create policy profile_update on public.profiles 
  for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy profile_insert on public.profiles 
  for insert to authenticated with check (auth_user_id = auth.uid());

create policy request_read on public.friend_requests 
  for select to authenticated using (sender_id = public.my_profile_id() or receiver_id = public.my_profile_id());

create policy friendship_read on public.friendships 
  for select to authenticated using (user_id = public.my_profile_id() or friend_id = public.my_profile_id());

create policy convo_read on public.conversations 
  for select to authenticated using (public.is_member(id));

create policy convo_update on public.conversations 
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy members_read on public.conversation_members 
  for select to authenticated using (public.is_member(conversation_id));

create policy members_update on public.conversation_members 
  for update to authenticated using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

create policy message_read on public.messages 
  for select to authenticated using (public.is_member(conversation_id));

create policy attachment_read on public.message_attachments 
  for select to authenticated using (
    exists(select 1 from public.messages where messages.id = message_id and public.is_member(conversation_id))
  );

create policy attachment_insert on public.message_attachments 
  for insert to authenticated with check (
    exists(select 1 from public.messages where messages.id = message_id and sender_id = public.my_profile_id())
  );

create policy message_reads_select on public.message_reads 
  for select to authenticated using (
    user_id = public.my_profile_id() or 
    exists(select 1 from public.messages where messages.id = message_id and public.is_member(conversation_id))
  );

create policy message_reads_insert on public.message_reads 
  for insert to authenticated with check (user_id = public.my_profile_id());

create policy message_reads_update on public.message_reads 
  for update to authenticated using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

create policy typing_status_select on public.typing_status 
  for select to authenticated using (public.is_member(conversation_id));

create policy typing_status_modify on public.typing_status 
  for all to authenticated using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

create policy notification_owner on public.notifications 
  for all to authenticated using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

create policy setting_owner on public.user_settings 
  for all to authenticated using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
