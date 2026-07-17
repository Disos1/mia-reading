-- ============================================================================
-- mia-reading · Migration 002 — progress tables (session_records, mastery_records)
--
-- Run this in the Supabase SQL Editor of the `mia-learning` project, AFTER 001.
-- Needed before the auth cutover (build plan Phase 6). Until it is applied the
-- app runs fine offline-first; the sync layer is fire-and-forget and simply
-- logs a warning when these tables are missing.
--
-- RULE (carried from 001): every CREATE TABLE is immediately followed by RLS
-- and its policies, in this same migration. RLS is never deferred.
--
-- Access model: each user reads/writes only their own rows, locked to
-- auth.uid() = user_id. profile_id is the app-generated identity (localStorage
-- primary); user_id is the Supabase auth uid used for RLS.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. reading.session_records — per-session summary (parent dashboard + trophies)
--    Mirrors src/types SessionRecord + sync.ts _pushSessionRecord exactly.
-- ────────────────────────────────────────────────────────────────────────────

create table reading.session_records (
  session_id         uuid primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  profile_id         uuid not null,
  mode               text not null check (mode in ('time','quantity','open')),
  started_at         timestamptz not null,
  completed_at       timestamptz,
  items_attempted    int not null default 0,
  items_correct      int not null default 0,
  primary_skill_code text not null default '',
  words_read         int not null default 0,
  max_combo          int,
  created_at         timestamptz not null default now()
);

alter table reading.session_records enable row level security;

create policy "users read own session records"
  on reading.session_records for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own session records"
  on reading.session_records for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own session records"
  on reading.session_records for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on reading.session_records to authenticated;
grant all on reading.session_records to service_role;

create index session_records_profile_time_idx
  on reading.session_records (profile_id, started_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. reading.mastery_records — per-skill mastery state (spec Part 3)
--    Mirrors src/types MasteryRecord + sync.ts _pushMasteryMap exactly.
-- ────────────────────────────────────────────────────────────────────────────

create table reading.mastery_records (
  user_id                uuid not null references auth.users(id) on delete cascade,
  profile_id             uuid not null,
  skill_code             text not null,
  status                 text not null check (status in ('שליטה','בתהליך','טרם נלמד')),
  first_attempt_accuracy real not null default 0,
  item_count             int  not null default 0,
  session_count          int  not null default 0,
  last_practiced_at      timestamptz,
  needs_retention_probe  boolean not null default false,
  retention_probe_due_at timestamptz,
  primary key (user_id, skill_code)
);

alter table reading.mastery_records enable row level security;

create policy "users read own mastery records"
  on reading.mastery_records for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own mastery records"
  on reading.mastery_records for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own mastery records"
  on reading.mastery_records for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on reading.mastery_records to authenticated;
grant all on reading.mastery_records to service_role;
