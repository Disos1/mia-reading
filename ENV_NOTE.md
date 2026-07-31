# Local env — read this before adding `.env.local`

**Do not point this app at the `mia-learning` Supabase project.** It was deleted
(Dima's free tier allows 2 projects: Mia Math + Dicart), and the old config now
resolves to NXDOMAIN. The retired file is kept as
`.env.local.RETIRED-mia-learning-project-deleted` for reference only.

## Running it

With **no** `.env.local`, the app runs fully offline: the auth gate is skipped,
everything persists to localStorage, and every feature works. That is the
correct way to run it today, and the way Mia will use it at launch.

## When sync is wanted (build plan D1, Phase 7)

Add a `reading` schema to the **existing mia-math Supabase project** rather than
creating a new one. Same origin, stays inside the 2-project limit, and that
project predates Supabase's June 3 2026 cutoff — so its auth email templates are
still editable and OTP-by-code works with no SMTP setup at all.
