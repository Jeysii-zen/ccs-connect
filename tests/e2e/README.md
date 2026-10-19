# Browser tests (Playwright)

Real browser tests for the UI. You don't start anything yourself:
`npx playwright test` resets the test database, starts the app and Reverb,
runs Chromium headless (desktop and Pixel 7 phone), then stops everything.

## Run

```bash
npm run test:e2e                         # everything, headless
npx playwright test tests/e2e/smoke.spec.ts
npx playwright test -g "dark mode"       # by test name
npx playwright test --project=mobile     # phone layout only
npm run test:e2e:ui                      # interactive runner: watch, step, time-travel
npm run test:e2e:report                  # open the last HTML report
```

A failed test is retried once with a trace; open it from the report or with
`npx playwright show-trace test-results/<test>/trace.zip`.

## How it is isolated

- **Database:** `ccs_connect_e2e` must be created beforehand, and the
  configured test account must have access to it. Before every run, the
  setup script rebuilds it using `migrate:fresh` and
  `Database\Seeders\E2eSeeder`. The reset refuses to run against another
  database or while Laravel's configuration is cached.
- **App:** PHP's built-in server on http://127.0.0.1:8123 with
  `DB_DATABASE=ccs_connect_e2e` (see `playwright.config.ts`). It serves the
  built assets in `public/build`, so run `npm run build` after frontend
  changes (or keep `composer run dev` running, which serves live assets).
- **Accounts** (password `password`): `admin@e2e.test`, `faculty@e2e.test`,
  `student@e2e.test` (26-99-001). Use `loginAs(page, 'admin')` from
  `support/fixtures.ts`.
- **Error check:** every test fails if the page throws a JavaScript error or
  logs a console error, even when no assertion looks at it.

- **Uploads:** files the tests upload land in the normal `storage/` folders.
  The files that e2e rows point to are deleted before and after every run
  (upload names are random, so dev files are never touched).
- **Sign-in:** `loginAs()` uses the real form (smoke tests). Feature tests use
  `signIn()`, which signs in once per role and reuses the session, because
  login is throttled to 5 per minute per account.

Event management specs live in `event-management/` (plan:
`specs/event-management.md`); shared steps such as `createEvent()` are in
`support/events.ts`. They run on desktop; `faculty.spec.ts` has the phone check.

## Writing tests with Claude Code

- **playwright-cli skill** (`.claude/skills/playwright-cli`): Claude drives a
  real browser to explore a page, reproduce a bug or check a fix.
- **Playwright Test agents** (`.claude/agents/playwright-test-*.md`, MCP
  server in `.mcp.json`):
  - `playwright-test-planner` explores the app from `seed.spec.ts` (signed in
    as admin) and writes a plan to `specs/`;
  - `playwright-test-generator` turns a plan into tests;
  - `playwright-test-healer` runs failing tests and fixes them.
- Regenerate the agents after upgrading Playwright:
  `npx playwright init-agents --loop=claude`, then move the new
  `seed.spec.ts`/`specs/` back into `tests/e2e/` if it recreates them.
