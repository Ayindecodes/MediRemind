# Contributing to MediRemind

## Setup

Requires Node.js 22 or newer.

```bash
npm ci
npx playwright install --only-shell chromium   # once, for the browser tests
cp .env.example .env.local                     # git ignores .env.local
```

In `.env.local`, set `JWT_SECRET` (`openssl rand -base64 32`). The other variables are optional locally:
without `RESEND_API_KEY`, sign-in codes are printed to the dev server log. `.env.example` explains each one,
and the server checks them when it starts (`lib/env.ts`).

## Scripts

| Command                          | What it does                                                    |
| -------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                    | Development server on http://localhost:3000                     |
| `npm run build`                  | Production build (needs no environment variables)               |
| `npm run lint`                   | ESLint (must report 0 problems)                                 |
| `npm run format`                 | Format everything with Prettier (`format:check` only checks)    |
| `npm test`                       | Unit and API tests with Vitest (`test:watch` re-runs on change) |
| `npm run test:e2e`               | Browser tests: builds the app and runs Playwright against it    |
| `npm run db:start`               | Start the local Supabase stack in Docker (`db:stop` stops it)   |
| `npm run db:reset`               | Rebuild the local database from the migrations and `seed.sql`   |
| `npm run db:status`              | Print the local URLs and keys                                   |
| `npm run db:test`                | Database tests (pgTAP) against the local database               |
| `npm run db:types`               | Regenerate `lib/db/database.types.ts` after a migration         |
| `npm run test:db`                | Data-layer tests (`tests/db`) against the local Supabase stack  |
| `npm run db:migration -- <name>` | Create a new migration in `supabase/migrations/`                |

CI (`.github/workflows/ci.yml`) runs lint, formatting, types, unit tests, the build, a security audit and the
browser tests on every pull request.

## Local database

The app is moving from JSON files to Supabase (Postgres) in Phase 3. The local stack runs in Docker, so
install Docker first; the app itself doesn't use the database yet.

```bash
npm run db:start    # first run downloads the images (a few minutes); later starts take about 30 seconds
npm run db:status   # the URLs and keys; Studio, the database UI, is at http://127.0.0.1:54323
npm run db:stop     # keeps the data; db:reset wipes it and re-applies the migrations
```

- Change the schema only through migrations (`npm run db:migration -- <name>`), never by editing the
  database in Studio, so every environment ends up the same. One table or change per migration, with a
  pgTAP test file next to the others in `supabase/tests/database/`; `npm run db:test` runs them and CI runs
  them on every pull request. The conventions are in [docs/database.md](docs/database.md).
- After a migration, run `npm run db:types` and commit the regenerated types. Server code reaches the
  database through `lib/db/` (see [docs/database.md](docs/database.md#the-data-layer)), tested with
  `npm run test:db`.
- From a script or another non-interactive shell, add `</dev/null` to `db:migration`: without a terminal
  the CLI waits to read the migration's SQL from standard input.
- The keys `db:status` prints are the same on every machine and only work locally, but don't paste its
  whole output into `.env.local`: its `JWT_SECRET` is Supabase's, not the app's.
- The local stack uses ports 54321–54324. `supabase/config.toml` turns off the services not used yet
  (realtime, storage, Edge Functions, analytics).

## Branches and pull requests

- Never commit directly to `main`. Branch from `main`, push, and open a pull request.
- Keep each pull request to one task. When one depends on another that isn't merged yet, base it on that
  branch (a stacked PR) and merge them in order.
- Merge with **"Create a merge commit"**. Squash would lose the small commits, and rebase changes commit IDs
  that `.git-blame-ignore-revs` relies on.
- Run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once, so `git blame` skips formatting-only
  commits (GitHub does this automatically).

## Commits

Make small commits, each one doing one thing and passing the type check on its own. Messages follow
[Conventional Commits](https://www.conventionalcommits.org/) and CI checks this on pull requests:

```
<type>(<optional scope>): <what changed, in the imperative>

<why, and anything a reviewer should know>
```

| Type       | For                                                                |
| ---------- | ------------------------------------------------------------------ |
| `feat`     | New behaviour users or developers can use                          |
| `fix`      | A bug fix                                                          |
| `refactor` | Code changes that don't change behaviour                           |
| `perf`     | Faster or lighter, same behaviour                                  |
| `test`     | Tests only                                                         |
| `docs`     | Documentation only                                                 |
| `style`    | Formatting only (list large reformats in `.git-blame-ignore-revs`) |
| `build`    | Build configuration                                                |
| `ci`       | CI workflows                                                       |
| `chore`    | Dependencies, tooling and other upkeep                             |
| `revert`   | Undoing an earlier commit                                          |

Common scopes: `api`, `auth`, `storage`, `env`, `email`, `dashboard`, `medications`, `add-medication`,
`landing`, `billing`, `deps`, `lint`, `e2e`.

## Code conventions

- **Formatting and lint:** Prettier decides the formatting; ESLint must report 0 problems. Don't disable a rule
  to silence it; fix the cause, or explain the exception in a comment.
- **Types:** no `any`. Narrow caught errors with `instanceof Error`.
- **React:** read browser storage with `useLocalStorageItem` / `useStoredUser` (`lib/useLocalStorage.ts`), not
  `setState` in an effect; define data loaders inside the effect that uses them; derive values with `useMemo`.
- **Navigation:** use `useRouter()` from `next/navigation`, not `window.location.href`.
- **Configuration:** read environment variables through `lib/env.ts`, never with a fallback secret.
- **Route handlers:** wrap protected handlers in `withUser()` and the others in `handleErrors()`
  (`lib/api/`), instead of writing token checks or try/catch blocks in each route.
- **Errors:** answer with `apiError(code, message)` so every error has the same shape; add a code to
  `ApiErrorCode` (`lib/types.ts`) only when no existing one fits. Pages read errors with `errorFrom()`.
- **Request bodies:** read them with `parseJsonBody()` and a schema in `lib/validation/`, never with
  `request.json()` directly. Add a schema test next to it.
- **Types:** shapes used by more than one file live in `lib/types.ts`; don't redefine them in a page.
- **Emails:** send with `sendEmail()` and pass user-provided text through `escapeHtml()` (`lib/email.ts`).
- **Copy:** don't claim anything that isn't true (certifications, user numbers, ratings, payment providers).

## Tests

- `lib/*.test.ts`: unit tests next to the code.
- `tests/api/*.test.ts`: call the real route handlers, using the helpers in `tests/helpers.ts`.
- `tests/db/*.test.ts`: the data layer against the local Supabase stack, as real signed-in people
  (`npm run test:db`).
- `supabase/tests/database/*.test.sql`: the schema and its access rules, in pgTAP (`npm run db:test`).
- `e2e/*.spec.ts`: browser tests against the production build.
- Tests must never touch the real `data/` folder; the helpers point storage at a temporary folder.
- A known bug can be recorded with `test.fail(...)` and a note pointing at the task that will fix it.

## Security

- Never commit secrets, `.env*` files or the contents of `data/` (it holds real user data).
- Report security problems privately to the maintainer rather than in a public issue.
