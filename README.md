# MediRemind

[![CI](https://github.com/Ayindecodes/MediRemind/actions/workflows/ci.yml/badge.svg)](https://github.com/Ayindecodes/MediRemind/actions/workflows/ci.yml)

MediRemind helps people keep track of their medications and take them on time, built first for users in
Nigeria.

## Status

Early development. What works today:

- Sign-up and login with a password plus a 6-digit code sent by email
- Adding, editing and deleting medications, with today's doses listed by time
- Marking doses as taken, dose history, a daily mood check-in and in-app notifications
- A free plan (up to 3 medications); paid plans are shown as coming soon

Not built yet:

- **Reminders**: nothing is sent at dose times yet
- **A database**: data is stored in JSON files, which works locally but can't be saved on Vercel. The move
  to Supabase (Postgres) has started: the local setup is in `supabase/`
- Streaks and adherence statistics (always 0), payments, family accounts

Known bug: a dose marked as taken shows as not taken again after reloading the page.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Resend (email) · zod · Vitest ·
Playwright · GitHub Actions · Vercel

## Getting started

Requires Node.js 22 or newer.

```bash
npm ci
cp .env.example .env.local   # then set JWT_SECRET: openssl rand -base64 32
npm run dev
```

Open http://localhost:3000. Without `RESEND_API_KEY`, sign-in codes are printed in the terminal running
`npm run dev` instead of being emailed.

## Configuration

Set these in `.env.local` locally, or in the Vercel project settings. The server checks them when it starts
and lists anything missing or invalid.

| Variable                                                                  | Required             | Purpose                                                       |
| ------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------- |
| `JWT_SECRET`                                                              | Always               | Signs login tokens. At least 32 characters                    |
| `RESEND_API_KEY`                                                          | In production        | Sends sign-in codes and other emails through Resend           |
| `NEXT_PUBLIC_APP_URL`                                                     | In production        | The app's public address, used for links in emails            |
| `CRON_SECRET`                                                             | When a cron job runs | Lets a scheduler call the cron routes. At least 32 characters |
| `MEDIREMIND_DATA_DIR`                                                     | No                   | Stores the JSON data somewhere other than `./data`            |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`        | For the database     | Where the Supabase project is, and its public key             |
| `SUPABASE_SECRET_KEY`                                                     | For the database     | Full database access for server code. Never `NEXT_PUBLIC_`    |
| `TERMII_API_KEY`, `TERMII_BASE_URL`, `TERMII_SENDER_ID`, `TERMII_CHANNEL` | For phone sign-in    | Sends sign-in codes by SMS through Termii                     |
| `SMS_HOOK_SECRET`                                                         | For phone sign-in    | Proves calls to the SMS hook come from Supabase               |

`.env.example` has the same list with more detail.

## Scripts

| Command            | What it does                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `npm run dev`      | Development server                                                                             |
| `npm run build`    | Production build (needs no environment variables)                                              |
| `npm run lint`     | ESLint                                                                                         |
| `npm run format`   | Format with Prettier (`format:check` only checks)                                              |
| `npm test`         | Unit and API tests (Vitest)                                                                    |
| `npm run test:e2e` | Browser tests (Playwright); run `npx playwright install --only-shell chromium` once first      |
| `npm run db:start` | Local Supabase in Docker (also `db:stop`, `db:status`, `db:reset`, `db:migration`, `db:types`) |
| `npm run test:db`  | Data-layer tests against the local Supabase (`db:test` runs the pgTAP database tests)          |

## Project structure

```
app/          Pages (landing, login, signup, dashboard) and API routes (app/api)
components/   Landing page sections
lib/          Storage (userStorage.ts, moving to db/), shared types (types.ts), request validation (validation/),
              route helpers (api/), configuration (env.ts), email (email.ts),
              browser helpers (apiClient.ts, useLocalStorage.ts)
tests/api/    Tests that call the API route handlers
tests/db/     Data-layer tests against the local Supabase stack
e2e/          Browser tests and a fake email server for them
data/         Local JSON data, created on first use (git-ignored: it holds real user data)
supabase/     Local Supabase config, migrations and seed data
docs/         Architecture and database notes
```

See [docs/architecture.md](docs/architecture.md) for how the pieces fit together.

## Testing and CI

`npm test` runs the unit and API tests, and `npm run test:e2e` runs the browser tests against a production
build. Tests never touch the real `data/` folder.

On every pull request, GitHub Actions runs lint, formatting, type-checking, the unit tests, a production
build, a security audit, the browser tests and a commit message check. `main` only accepts changes whose
checks pass.

## Deployment

Vercel deploys `main` to production and every pull request as a preview. Before relying on a deployment, set
`JWT_SECRET`, `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` in the Vercel project.

Two current limits:

- Vercel doesn't allow writing files, so sign-ups and other data can't be saved there until the planned
  database is in place.
- Emails are sent from Resend's test address (`onboarding@resend.dev`), which only delivers to the Resend
  account owner until a sending domain is verified.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branching, commit and code conventions. Please report security
problems privately to the maintainer rather than in a public issue.
