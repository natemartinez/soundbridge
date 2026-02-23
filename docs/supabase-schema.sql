-- OnSpace MVP - Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('musician', 'church')),
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  location_city text not null default '',
  location_state text not null default '',
  created_at timestamptz not null default now(),
  account_tier text not null default 'basic'
    check (account_tier in ('basic', 'premium'))
);

alter table public.profiles enable row level security;

create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- MUSICIAN DETAILS
-- ============================================================
create table if not exists public.musician_details (
  id uuid references public.profiles on delete cascade primary key,
  instruments text[] not null default '{}',
  experience_years integer not null default 0,
  available boolean not null default true,
  rate_per_service numeric
);

alter table public.musician_details enable row level security;

create policy "Anyone can view musician details"
  on public.musician_details for select
  using (true);

create policy "Musicians can update own details"
  on public.musician_details for update
  using (auth.uid() = id);

create policy "Musicians can insert own details"
  on public.musician_details for insert
  with check (auth.uid() = id);

-- ============================================================
-- CHURCH DETAILS
-- ============================================================
create table if not exists public.church_details (
  id uuid references public.profiles on delete cascade primary key,
  denomination text not null default '',
  worship_style text not null default 'contemporary'
    check (worship_style in ('contemporary', 'traditional', 'blended')),
  congregation_size text not null default 'medium'
    check (congregation_size in ('small', 'medium', 'large')),
  website_url text
);

alter table public.church_details enable row level security;

create policy "Anyone can view church details"
  on public.church_details for select
  using (true);

create policy "Churches can update own details"
  on public.church_details for update
  using (auth.uid() = id);

create policy "Churches can insert own details"
  on public.church_details for insert
  with check (auth.uid() = id);

-- ============================================================
-- GIGS
-- ============================================================
create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.profiles on delete cascade,
  title text not null,
  description text not null default '',
  instruments_needed text[] not null default '{}',
  date text not null,
  time text not null,
  pay_offered numeric,
  status text not null default 'open'
    check (status in ('open', 'filled', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.gigs enable row level security;

create policy "Anyone can view open gigs"
  on public.gigs for select
  using (true);

create policy "Churches can insert own gigs"
  on public.gigs for insert
  with check (auth.uid() = church_id);

create policy "Churches can update own gigs"
  on public.gigs for update
  using (auth.uid() = church_id);

-- ============================================================
-- CONVERSATIONS (stub for future messaging)
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles on delete cascade,
  participant_b uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_a, participant_b)
);

alter table public.conversations enable row level security;

create policy "Participants can view own conversations"
  on public.conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b);

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

-- ============================================================
-- MESSAGES (stub for future messaging)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Conversation participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "Conversation participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- ============================================================
-- MIGRATIONS (run in Supabase SQL Editor for existing databases)
-- ============================================================

-- 2026-02-23: Add premium subscription tier
alter table public.profiles
  add column if not exists account_tier text not null default 'basic'
  check (account_tier in ('basic', 'premium'));
