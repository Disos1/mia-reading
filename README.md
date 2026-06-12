# mia-reading

Hebrew reading practice app for Mia — comprehension (primary) and fluency (secondary).
Part of the Mia-Learning suite: hub (`/mia-learning/`), math (`/mia-math/`), reading (`/mia-reading/`), all on `disos1.github.io` sharing one Supabase project (`mia-learning`).

**Live:** https://disos1.github.io/mia-reading/

## Stack

Vite + React 19 + TypeScript + Tailwind v3 · Supabase (Postgres + Auth, `reading.*` schema, RLS on every table) · Email OTP auth (no magic links) · Hebrew RTL, gender-aware i18n (`he_f.json` / `he_m.json`) · GitHub Pages via Actions (`gh-pages` branch)

## Development

```bash
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm install
npm run dev
```

Without `.env.local` the app runs in offline mode (auth gate skipped).

## Rules of the repo

1. RLS enabled inline with every `CREATE TABLE` — never as a follow-up migration.
2. Secrets (`sb_secret_*`) never enter this repo or any bundled file.
3. Email OTP only — magic links are forbidden (they break on shared kids' devices).
4. All Hebrew strings live in `src/i18n/` — never hardcoded in JSX.
5. localStorage keys use the `mia_reading_` prefix; the origin is shared with the hub and math apps.

## Migrations

SQL files in `supabase/migrations/` are applied by pasting into the Supabase SQL Editor (mia-learning project).
