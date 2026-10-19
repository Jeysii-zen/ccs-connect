# CCS Connect: changes on `feature/event-management` since the last git checkpoint

> Written 2026-10-19. Purpose: hand this file to an assistant (e.g. ChatGPT) so it can
> give me step-by-step instructions to checkpoint, commit, push and merge this branch
> into `main` **by hand**. Nothing below has been staged or committed yet.

## 1. Repository facts

| Item | Value |
|---|---|
| Remote | `origin` = `https://github.com/Jeysii-zen/ccs-connect.git` |
| Working branch | `feature/event-management` |
| Target branch | `main` |
| Last checkpoint (HEAD) | `2436792` "Merge pull request #10 … dependabot/github_actions …" (2026-10-18). The branch was fast-forwarded to `origin/main` at that commit, so it starts level with `main`. |
| Uncommitted work | 53 tracked files modified/deleted (+4,900 / −2,200 lines) and ~115 new files (excluding generated graph files) |
| My machine | Windows 11, PowerShell and Git Bash, PHP 8.4, Node 22, MySQL |
| CI | `.github/workflows/tests.yml` runs on every pull request and on push to `main`: `composer setup` (copies `.env.example` → `.env`, migrates, `npm run build`), then `composer ci:check` (vite build + PHPStan + Pint + Pest) on Ubuntu with MySQL 8 |
| Line endings | Git warns `package.json` CRLF will become LF. This is harmless. |

## 2. What was built (feature summary)

All of this is new since `2436792`.

### Event management (Phase 5)
- Faculty and Admin create, edit, publish, archive and delete events with a poster upload. Admin manages every event; Faculty manage only their own (`EventPolicy`).
- Only Draft/Published/Archived are stored. Open/Full/Closed/Ongoing/Completed are derived by `Event::lifecycleStatus()`.
- Public events list and detail pages for students; "My registrations" page.
- Locations table, with "Palma Hall" seeded as the only approved location.

### Registration and proof photos (Phase 6)
- Students register (no cancellation, per questionnaire Q25). Year and block are copied from the account at registration.
- Optional proof photo per event with an upload window. Faculty/Admin approve or reject with a reason. EXPIRED is derived, not stored.

### QR check-in and attendance (Phase 7)
- Rotating QR code on the manager's screen (HMAC, changes every 15 s, nothing stored). Students scan it during the event.
- Attendance (Attended/Pending/Absent/Incomplete) is derived from the check-in plus proof. Faculty/Admin can override it by hand and reset it back to automatic.
- Participants page with attendance and proof filters. Archived events are read-only.

### Event Participation Reports (Q39/Q40), built this session
- "Generate report" button on the Participants page → confirm → preview → **Export PDF** or **Export Excel (.xlsx)**.
- Contents: event title, date, time, location, target participants, totals (registered, attendees, absentees, pending/incomplete), proof submitted/approved/rejected (only when proof is required), attendance rate, and a breakdown by year and section.
- Built on demand from live data, with no report table (Q40 option C). Faculty can report only on their own events, Admin on all.
- New: `EventReportController`, `EventReportService`, `resources/views/reports/event-participation.blade.php`, route `/{admin|faculty}/events/{event}/report/{preview|pdf|xlsx}`.

### Security baseline
- `EnsureAccountIsActive` (deactivated accounts are signed out), `SecurityHeaders` (nosniff, SAMEORIGIN framing, referrer and permissions policy).
- Rate limits: login 5/min per account and 60/min per IP, password reset 20/hour per IP, uploads 20/min, writes 60/min. Inline "Too many attempts" messages.
- Generic forgot-password reply (`PasswordResetLinkResponse`). Private proof photos are served only through authorized routes.
- Fixed two existing 500 errors (login with an unknown identifier; Fortify confirm-password lookup).

### Performance
- `ImageOptimizer` converts every upload to WebP (max 1920 px). `php artisan images:compress` backfills old uploads.
- List query indexes (migration `000004`), lazy images, `docs/deployment-performance.md`.

### UI and UX
- Real-time "online" status on the Accounts page via **Laravel Reverb** (presence channel, `routes/channels.php`).
- Dark mode (generated `resources/css/dark.css`; toggle saved in a cookie), skeleton loading screens.
- Toasts, modern form modals, glass confirm dialogs, image dropzone, date-time input, responsive tables and cards.
- Profile rework: users edit only their email and profile picture; self-delete was removed (`DeleteUserForm.jsx` deleted, replaced by a "visit the CCS office" notice).
- Student/faculty dashboard layout (`StudentDashboardLayout`). Large UI updates to the Accounts, Announcements and Dashboard pages.

### Testing
- PHP (Pest): 384 tests, including new suites for events, registration, proof, attendance, reports, security, presence, images and indexes.
- JS unit tests in `tests/js/`.
- **Playwright browser tests** (`tests/e2e/`): 66 tests on desktop plus a phone layout. They run against a separate `ccs_connect_e2e` database and never touch the dev DB. Run with `npm run test:e2e`.

## 3. Dependencies added

| Package | Kind | Why |
|---|---|---|
| `laravel/reverb` ^1.12 | composer | real-time presence (also downgraded guzzle 8 → 7, framework unchanged) |
| `barryvdh/laravel-dompdf` ^3.1 | composer | PDF report export |
| `openspout/openspout` ^5.12 | composer | Excel (.xlsx) report export |
| `laravel-echo`, `pusher-js` | npm | Reverb client |
| `@playwright/test` (dev) | npm | browser tests |

`composer.lock` and `package-lock.json` changed accordingly. Commit them.

## 4. Database migrations (new; run `php artisan migrate`)

1. `2026_10_18_000001_create_locations_table.php`
2. `2026_10_18_000002_create_events_table.php`
3. `2026_10_18_000003_create_event_registrations_table.php`
4. `2026_10_18_000004_add_list_query_indexes.php`

Seeders: `LocationSeeder` (Palma Hall), `E2eSeeder` (only for the e2e database). All four migrations are already applied on my dev DB.

## 5. Environment / server changes

- `.env.example` now lists the Reverb variables (`REVERB_APP_ID/KEY/SECRET/HOST/PORT/SCHEME` and the `VITE_REVERB_*` copies), with empty values. `BROADCAST_CONNECTION` stays `log` there, so CI behaves as before. To use presence, set it to `reverb` in your real `.env`. My local `.env` already has real values. **Never commit `.env`.**
- `composer run dev` now also starts Reverb on port 8080.
- Local only, not in git: OPcache and GD were enabled in `C:\php-8.4.12\php.ini` (backup `php.ini.bak-2026-10-18`). A production server needs the `gd`, `zip`, `dom`, `mbstring` and `xmlwriter` PHP extensions.

## 6. What to commit and what not to

**Commit:** everything under `app/`, `bootstrap/`, `config/`, `database/`, `docs/`, `public/images/`, `resources/`, `routes/`, `scripts/`, `tests/`, plus `composer.json`, `composer.lock`, `package.json`, `package-lock.json`, `playwright.config.ts`, `.gitignore`, `.env.example`.

**Do not commit:**
- `HANDOFF.md`: AI session notes; delete it or leave it untracked.
- `.env`: secrets (already gitignored).
- `.playwright-mcp/` and `graphify-out/cache/`: now gitignored by this change.
- `.claude/`, `CLAUDE.md`, `.mcp.json`: already gitignored on purpose (local AI tooling).

**Your choice:** `graphify-out/` (minus the ignored cache) is a generated code map: `graph.json`, `GRAPH_REPORT.md`, `graph.html`, `manifest.json` and labels. The project notes treat a committed `graph.json` as normal. If you'd rather not track it, add `/graphify-out/` to `.gitignore` before staging.

**This file** (`docs/changes-feature-event-management.md`) can be committed as a change log or deleted after use.

## 7. Verification results (2026-10-19, this machine)

| Check | Result |
|---|---|
| `npm run build` | OK |
| Pint (`composer run lint:check`) | passed |
| PHPStan level 7 | 0 errors |
| Pest (`php artisan test`) | 384 tests passed |
| Playwright full suite | 65 passed, 0 failed, 49 skipped (mobile duplicates skipped on purpose), 14.9 min, run before reports were added; the new report browser test passed separately |
| `composer run ci:check` (full gate, after the reports feature) | passed: build OK, Pint OK, PHPStan 0 errors, Pest 384/384 (2,283 assertions) |

Note: Composer stops scripts after 300 s. Pest alone takes about 2 minutes, so this only bites when the machine is busy (e.g. e2e running at the same time).

## 8. Suggested commit plan

One commit is simplest and always buildable. If you prefer smaller commits, this order keeps each step coherent. Files used by several features (e.g. `routes/web.php`, `app/Models/*`, `bootstrap/app.php`) belong with the first commit that needs them.

1. `chore: ignore local tool output; document Reverb env vars`: `.gitignore`, `.env.example`
2. `feat(events): event management, registration, proof review, QR attendance`: event controllers/requests/services/models/policies, migrations, factories, seeders, event pages and components, `routes/web.php`, related tests
3. `feat(reports): event participation report with PDF/Excel export`: `EventReportController`, `EventReportService`, report Blade view, `tests/Feature/Reports/`, `composer.json`/`composer.lock` (dompdf, openspout)
4. `feat: security baseline, rate limiting, image optimisation`: middleware, providers, `ImageOptimizer`, `CompressImages`, related tests, `docs/deployment-performance.md`
5. `feat(ui): presence via Reverb, dark mode, skeletons, profile rework`: layouts, ui components, `dark.css`, `scripts/generate-dark-theme.py`, `config/reverb.php`, `config/broadcasting.php`, `routes/channels.php`, npm lock changes
6. `test(e2e): Playwright suite for event management`: `playwright.config.ts`, `tests/e2e/`

Because `routes/web.php`, `composer.lock` and the models mix several features, splitting by hand is error-prone. **A single commit (or 2–3 broad ones) is the safer choice.**

## 9. Merge notes for the assistant

- Before merging, fetch and check whether `origin/main` moved past `2436792`. If it did, merge or rebase `main` into the branch and re-run `composer run ci:check`.
- Open a pull request `feature/event-management` → `main` so the GitHub Actions `tests` workflow runs. Merge only when it is green.
- After merging, on any machine: `composer install`, `npm install`, `php artisan migrate`, `npm run build`, then fill in the Reverb values in `.env`.

## 10. Known open items (not blockers)

- Mobile admin event cards lack the "by <creator>" line that desktop rows show.
- 36 old unreferenced files in `storage/app/public/events` (not tracked by git; leftovers from test runs).
- Reverb is sometimes unreachable during e2e runs (cause unknown). The test fixture ignores only that one WebSocket error.
- No browser test yet for QR check-in during an ongoing event or for student proof upload.
- Admin dashboard statistics (SSD7-C) not built yet.
- `target_participants` is free text; eligibility is not enforced.
- Production hardening is still to do: `APP_DEBUG=false`, secure cookies, a non-root DB user, and the DB password currently committed in `phpunit.xml`.
