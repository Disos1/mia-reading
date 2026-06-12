-- ============================================================================
-- mia-reading · Migration 001 — reading.* schema, Week 1
--
-- Run this in the Supabase SQL Editor of the `mia-learning` project.
-- The `reading` schema itself already exists and is exposed via the API.
--
-- RULE: every CREATE TABLE is immediately followed by ENABLE ROW LEVEL
-- SECURITY and its policies, in this same migration. RLS is never deferred.
--
-- Access model:
--   - Content tables (passages, passage_questions): read-only for signed-in
--     users, published passages only. Content is written exclusively by the
--     generation pipeline using the secret key (server-side, Week 3+).
--   - Per-user tables (user_passage_history, attempts): each user sees and
--     writes only their own rows, locked to auth.uid().
--   - anon gets NOTHING in the reading schema.
-- ============================================================================

grant usage on schema reading to authenticated;
grant usage on schema reading to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. reading.passages — the passage bank (spec Part 9)
-- ────────────────────────────────────────────────────────────────────────────

create table reading.passages (
  id uuid primary key default gen_random_uuid(),
  level int not null check (level between 1 and 3),
  vocab_tier text not null check (vocab_tier in ('T1','T2','T3','MIXED')),
  word_count int not null,
  text_full_nikud text not null,
  text_partial_nikud text,
  text_no_nikud text,
  character_names text[],
  genre text,
  audio_url_full_nikud text,
  audio_url_partial_nikud text,
  audio_url_no_nikud text,
  created_at timestamptz default now(),
  validated_at timestamptz,
  is_published boolean default false
);

alter table reading.passages enable row level security;

create policy "signed-in users read published passages"
  on reading.passages for select
  to authenticated
  using (is_published = true);

-- No insert/update/delete policies: clients can never write content.
grant select on reading.passages to authenticated;
grant all on reading.passages to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. reading.passage_questions — comp questions per passage (spec Part 9)
-- ────────────────────────────────────────────────────────────────────────────

create table reading.passage_questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references reading.passages(id) on delete cascade,
  skill_code text not null,
  question_text text not null,
  options jsonb not null,
  correct_option int not null,
  hint_text text,
  question_level int not null check (question_level between 1 and 3)
);

alter table reading.passage_questions enable row level security;

create policy "signed-in users read questions of published passages"
  on reading.passage_questions for select
  to authenticated
  using (
    exists (
      select 1 from reading.passages p
      where p.id = passage_id and p.is_published = true
    )
  );

grant select on reading.passage_questions to authenticated;
grant all on reading.passage_questions to service_role;

create index passage_questions_passage_idx
  on reading.passage_questions (passage_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. reading.user_passage_history — 10-day no-repeat tracking (spec Part 9)
--    last_shown_at is upserted the moment a passage renders, so the
--    composer's no-repeat filter holds even if a session is abandoned.
-- ────────────────────────────────────────────────────────────────────────────

create table reading.user_passage_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid not null references reading.passages(id) on delete cascade,
  last_shown_at timestamptz not null default now(),
  primary key (user_id, passage_id)
);

alter table reading.user_passage_history enable row level security;

create policy "users read own passage history"
  on reading.user_passage_history for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own passage history"
  on reading.user_passage_history for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update own passage history"
  on reading.user_passage_history for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on reading.user_passage_history to authenticated;
grant all on reading.user_passage_history to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. reading.attempts — per-skill attempt ledger
--    Feeds the mastery state machine (rolling last-10 window per skill,
--    spec Part 3), error-signature detection (Part 4) and the parent
--    dashboard (Part 8). Append-only: no update/delete policies on purpose —
--    a kid's history is never rewritten by the client.
--    skill_code holds one of the 24 taxonomy codes; validation lives in the
--    app layer (sync.ts is the single source of truth, spec Part 11 risk 5).
-- ────────────────────────────────────────────────────────────────────────────

create table reading.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_code text not null,
  passage_id uuid references reading.passages(id) on delete set null,
  question_id uuid references reading.passage_questions(id) on delete set null,
  item_format smallint check (item_format between 1 and 5),
  is_correct boolean not null,
  used_hint boolean not null default false,
  response_ms integer,
  session_id uuid,
  reading_level smallint check (reading_level between 1 and 3),
  nikud_state text check (nikud_state in ('full','partial','none')),
  created_at timestamptz not null default now()
);

alter table reading.attempts enable row level security;

create policy "users read own attempts"
  on reading.attempts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own attempts"
  on reading.attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on reading.attempts to authenticated;
grant all on reading.attempts to service_role;

-- Rolling-window reads: "last 10 attempts for user X on skill Y"
create index attempts_user_skill_time_idx
  on reading.attempts (user_id, skill_code, created_at desc);
