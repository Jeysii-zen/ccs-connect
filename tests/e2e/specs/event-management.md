# Event Management Test Plan

## Application Overview

Status: verified in a real browser (desktop Chromium) on 2026-10-19 against the e2e app at http://127.0.0.1:8123. Scenarios marked "not browser-verified" could not be exercised (noted inline).

Seed: `tests/e2e/seed.spec.ts` (signed in as admin). Accounts (password `password`): admin@e2e.test ("Ada Admin", lands on /admin/accounts after login), faculty@e2e.test ("Fe Faculty", lands on /dashboard), student@e2e.test ("Stu Student", 26-99-001, year 3 block 2, lands on /dashboard). Only location: "Palma Hall". Poster fixture: tests/e2e/fixtures/poster.png. The e2e database starts with no events.

## Conventions (verified)

- Every test imports `test`, `expect`, `loginAs` from `./support/fixtures`. The fixture fails on ANY console error or page error. Each test creates its own data with unique titles (`Title ${Date.now()}`). Dates are relative to today (2026-10-19); examples use 2026-11-20.
- Login: `getByLabel('Email / ID Number')`, `getByLabel('Password', { exact: true })` (exact is REQUIRED: "Show password" button also matches), button "Sign In". Login is slow (up to several seconds); use generous waits.
- Pages: admin `/admin/events`, faculty `/faculty/events` (heading "Events"; admin subtitle "Create, publish, and manage every CCS event."; faculty subtitle "Create, publish, and manage the events you organize."; admin has eyebrow "CCS Connect · Administration"). Button "Create event". Admin sidebar links: "All Events", "Drafts", "Published", "Archived", "Create Event" (`/admin/events?create=1`). Faculty has no such sidebar.
- List tabs (role tab, in tablist "Event status"): "All events", "Drafts", "Published", "Archived", each with a count badge (accessible name e.g. "Drafts 1"; counts are global, not filtered by search). Tab URLs use `?view=all|drafts|published|archived`. Search box (role searchbox) "Search events by title", 400 ms debounce, URL param `q` (e.g. `?q=Pub%20B&view=all`). Empty states: "No events here yet" / "Create an event to start sharing CCS activities."; with a search: "No events match your search" / "Try a different title or clear the search.".
- After a successful create the app navigates to the tab matching the new status (`?view=drafts` or `?view=published`) and drops `create=1`. Publish/archive/delete stay on the current tab.
- Row buttons (aria-label): `View <title>`, `Participants of <title>`, `Edit <title>`, `Publish <title>`, `Archive <title>`, `Delete <title>`. The title/"by <creator>" cell is also a button named e.g. "<title> by Ada Admin". Desktop renders a table (columns Event, Date and time, Location, Capacity, Status, Actions); phone (<768px) renders cards in `main li`. Use getByRole (hidden duplicates are excluded). Faculty rows show no "by" line; admin rows show "by <creator>".
- Create modal (role dialog, heading "Create event"): labels "Event title", "Description", "Date", "Start time", "End time", "Registration deadline", "Location" (select, option "Palma Hall"), "Target participants", "Max participants", poster `input[type=file]` (dropzone button "Drag and drop the event poster here"), checkbox "Require a proof photo" which reveals "Uploads open" and "Uploads close" (datetime-local). Buttons "Cancel", "Save as draft", "Save and publish", close button "Close event form". Edit modal heading "Edit event", button "Save changes". Use `getByLabel('Date', { exact: true })`. Fill native inputs with fill(): '2026-11-20', '09:00', '2026-11-19T09:00'.
- Valid data: date days ahead, 09:00-11:00, deadline day before 09:00, location Palma Hall, target "BSCS 3rd year", max 30, poster attached.
- Saving is slow (1-3 s, footer shows "Saving on the server..."). Wait for the toast, not a fixed delay. Toasts are role=status: "Event saved as draft successfully.", "Event published successfully.", "Event updated successfully.", "Event archived successfully.", "Event deleted successfully." (toast has a "Dismiss notification" button).
- Confirm dialogs are role=alertdialog: "Publish event?" ("<title> will become visible to students and guests.", buttons Cancel / "Publish event"); "Archive event?" ("<title> will be hidden from public lists and can no longer be edited. Its records, including registrations, are kept.", Cancel / "Archive event"); "Delete event?" ("You are about to permanently delete <title>. Its poster and any registrations are removed too. This cannot be undone; archive the event instead to keep its history.", Cancel / "Delete event"); "Discard changes?" ("Your unsaved changes to this event will be lost.", Cancel / "Discard") appears when closing a dirty create/edit modal.
- View details dialog (role dialog, opened by `View <title>` or the title button; Escape closes): status badge, title, DATE, TIME, LOCATION, PARTICIPANTS ("0 of 30 registered · registration closes ..."), PROOF PHOTO ("Not required" or "Required · uploads <start> to <end>"), CREATED BY, Target participants, Description; buttons Delete, Participants, Edit, Publish/Archive depending on status.
- Validation is two-stage. Client side (immediately on field change and on submit, no server call) covers: poster missing "Upload a poster or image for the event."; poster type "The poster must be a JPG, PNG or WEBP image."; "The end time must be after the start time."; "The event must start in the future." (shown under Date); "The registration deadline must be on or before the event start." ; "The registration deadline must be in the future."; "Set when proof photo uploads open."; "Set when proof photo uploads close."; "Proof uploads cannot open before the event starts."; "Proof uploads must close after they open."; footer alert "Please fix the highlighted fields.". Only when client checks pass does the server validate: "The title field is required.", "The description field is required.", "The event date field is required.", "The start time field is required.", "The end time field is required.", "The registration deadline field is required.", "The location id field is required." (sic), "The target participants field is required.", "The max participants field is required.", "The max participants field must be at least 1.", "... must not be greater than 100000.", "... must be an integer.". Server errors take 1-3 s to appear.
- 403 pages: navigating with `page.goto` to a forbidden URL logs a "Failed to load resource ... 403" console error, which fails the fixture. Check forbidden access with `page.request` (status 403) instead, or accept that error explicitly. For mutating requests send header `X-XSRF-TOKEN` (decoded `XSRF-TOKEN` cookie) and `Accept: application/json`.
- FIXED 2026-10-19 (was a known bug): attaching a poster and then editing any other field logged "Failed to load resource: net::ERR_FILE_NOT_FOUND @ blob:...". Inertia's useForm deep-clones the File on every setData, and the preview revoked its URL on identity change; `resources/js/lib/useObjectUrl.js` now keys on the file's contents. Mobile cards do not show the "by <creator>" line (desktop rows do).
- Throttles: `throttle:uploads` (20/min) on create/update, `throttle:writes` (60/min) on publish/archive/delete.

## Test Scenarios

### 1. 1. Admin event management (/admin/events)

**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1. Empty state

**File:** `tests/e2e/event-management/admin-empty-state.spec.ts`

**Steps:**
  1. As admin open /admin/events on a fresh database
    - expect: Heading 'Events' and subtitle 'Create, publish, and manage every CCS event.'
    - expect: 'No events here yet' and 'Create an event to start sharing CCS activities.'
    - expect: All four tab counts are 0

#### 1.2. Create draft

**File:** `tests/e2e/event-management/admin-create-draft.spec.ts`

**Steps:**
  1. Click 'Create event', attach poster, fill valid data, click 'Save as draft'
    - expect: Modal closes, toast 'Event saved as draft successfully.', URL ends ?view=drafts
    - expect: Row shows title, 'by Ada Admin', 'Nov 20, 2026', '9:00 AM – 11:00 AM', 'Palma Hall', capacity '0 / 30', Draft badge
    - expect: Drafts and All counts are 1

#### 1.3. Create and publish

**File:** `tests/e2e/event-management/admin-create-publish.spec.ts`

**Steps:**
  1. Fill valid data and click 'Save and publish'
    - expect: Toast 'Event published successfully.', URL ?view=published, row in Published tab
    - expect: A guest sees the title on /events (badge 'Open') and /events/<id> loads

#### 1.4. Proof photo required saves and shows window

**File:** `tests/e2e/event-management/admin-proof-required.spec.ts`

**Steps:**
  1. Check 'Require a proof photo', set 'Uploads open' 2026-11-27T09:00 (event start) and 'Uploads close' 2026-11-27T18:00, save as draft, open View
    - expect: View shows 'Required · uploads Nov 27, 2026, 9:00 AM to Nov 27, 2026, 6:00 PM'
    - expect: Edit shows checkbox checked with both values

#### 1.5. Edit a draft

**File:** `tests/e2e/event-management/admin-edit-draft.spec.ts`

**Steps:**
  1. Click 'Edit <title>', change title and Max participants, click 'Save changes'
    - expect: Heading was 'Edit event'; toast 'Event updated successfully.'
    - expect: Row shows new title and new capacity; still Draft

#### 1.6. Edit a published event keeps it Published

**File:** `tests/e2e/event-management/admin-edit-published.spec.ts`

**Steps:**
  1. Edit description of a published event and save
    - expect: Toast 'Event updated successfully.'
    - expect: Event remains in Published tab; View shows new description

#### 1.7. Edit event with registrations restricts proof and capacity

**File:** `tests/e2e/event-management/admin-edit-registered.spec.ts`

**Steps:**
  1. Publish a max-1 event, register as student (event page > Register > 'Confirm registration'), as admin open Edit
    - expect: Proof checkbox disabled with 'Fixed because 1 student has already registered.'
    - expect: Max participants 0 then Save changes shows 'Max participants cannot be lower than the 1 students already registered.' and the modal stays open

#### 1.8. View details

**File:** `tests/e2e/event-management/admin-view-details.spec.ts`

**Steps:**
  1. Click `View <title>` then press Escape; repeat via the title button
    - expect: Dialog shows title, DATE, TIME, 'Palma Hall', PARTICIPANTS, PROOF PHOTO 'Not required', CREATED BY 'Ada Admin', target and description
    - expect: Escape closes it

#### 1.9. Tabs and counts

**File:** `tests/e2e/event-management/admin-tabs.spec.ts`

**Steps:**
  1. Create one draft, one published, one archived event; click each tab
    - expect: Each tab lists only its own events; All events lists all 3; badges read 1/1/1 and 3
    - expect: URL gets ?view=<tab>

#### 1.10. Search

**File:** `tests/e2e/event-management/admin-search.spec.ts`

**Steps:**
  1. With 'Alpha ...' and 'Beta ...' events, type Alpha in 'Search events by title'
    - expect: Only Alpha row after debounce; URL has q=Alpha
    - expect: Typing zzzz shows 'No events match your search' and 'Try a different title or clear the search.'; tab badges unchanged
    - expect: Clearing restores all rows and removes q
    - expect: Search combined with the Published tab filters within that tab

#### 1.11. Delete with confirmation

**File:** `tests/e2e/event-management/admin-delete.spec.ts`

**Steps:**
  1. Click `Delete <title>`, read the dialog, Cancel, then delete again and confirm 'Delete event'
    - expect: Dialog 'Delete event?' names the title
    - expect: Cancel keeps the row
    - expect: Confirm: toast 'Event deleted successfully.', row gone, count drops

#### 1.12. Participants page

**File:** `tests/e2e/event-management/admin-participants.spec.ts`

**Steps:**
  1. Click `Participants of <title>`
    - expect: URL /admin/events/<id>/participants, title 'Participants · <title> - CCS Connect'
    - expect: Shows status badge, date/place, link 'Check-in QR', 'REGISTERED 0 / 30', attendance filters All/Attended/Pending/Absent/Incomplete, 'No students have registered yet'

#### 1.13. Check-in screen for draft or future event shows no QR

**File:** `tests/e2e/event-management/admin-checkin-future.spec.ts`

**Steps:**
  1. From participants click 'Check-in QR' for a draft, then for a future published event
    - expect: URL /admin/events/<id>/check-in, 'QR CHECK-IN', title, status badge (Draft / Open / Full)
    - expect: No QR code is shown; text 'The check-in code is shown only while the event is ongoing.' and '0 / 0 checked in' (or '0 / N') plus 'No one has checked in yet.'
    - expect: Only link: 'Participants'

#### 1.14. Create link and create=1 modal

**File:** `tests/e2e/event-management/admin-create-link.spec.ts`

**Steps:**
  1. Open /admin/events?create=1, then close with 'Close event form', Escape and Cancel in turn (reloading each time); also click the sidebar 'Create Event' link
    - expect: Create modal opens, heading 'Create event'
    - expect: After closing, the URL becomes ?view=all (create=1 dropped, may lag ~1 s) and the dialog is gone
    - expect: Clean modal closes without a discard prompt

#### 1.15. Discard changes prompt

**File:** `tests/e2e/event-management/admin-discard.spec.ts`

**Steps:**
  1. Open create modal, type a title, click Cancel; in the 'Discard changes?' alertdialog click Cancel, then close again and click 'Discard'
    - expect: Prompt text 'Your unsaved changes to this event will be lost.'
    - expect: Cancel keeps the modal and the typed title; Discard closes the modal

### 2. 2. Faculty event management (/faculty/events)

**Seed:** `tests/e2e/seed.spec.ts`

#### 2.1. Faculty creates a draft

**File:** `tests/e2e/event-management/faculty-create.spec.ts`

**Steps:**
  1. loginAs faculty (lands on /dashboard), open /faculty/events, create a draft
    - expect: Subtitle 'Create, publish, and manage the events you organize.'
    - expect: Toast 'Event saved as draft successfully.', URL ?view=drafts, row with Draft badge and NO 'by <name>' line

#### 2.2. Full lifecycle on own event

**File:** `tests/e2e/event-management/faculty-lifecycle.spec.ts`

**Steps:**
  1. Publish ('Publish event'), edit, archive ('Archive event'), then delete from the Archived tab
    - expect: Toasts: published, updated, archived, deleted successfully
    - expect: Archived row offers View, Participants, Delete only
    - expect: All tab counts return to 0

#### 2.3. Only own events are listed

**File:** `tests/e2e/event-management/faculty-own-only.spec.ts`

**Steps:**
  1. As admin create an event, as faculty create one, compare lists
    - expect: Faculty list shows only the faculty event
    - expect: Admin list shows both; faculty event row shows 'by Fe Faculty', admin event 'by Ada Admin'

#### 2.4. Cannot change another user's event

**File:** `tests/e2e/event-management/faculty-forbidden-actions.spec.ts`

**Steps:**
  1. As faculty, via page.request with XSRF header: PUT /faculty/events/<adminEventId>, PATCH .../publish, PATCH .../archive, DELETE, GET .../participants, GET .../check-in
    - expect: Every response is 403
    - expect: Admin's event is unchanged

#### 2.5. Mobile layout (mobile project)

**File:** `tests/e2e/event-management/faculty-mobile.spec.ts`

**Steps:**
  1. At 390x844 create a draft via the modal, then use the card buttons
    - expect: Cards in `main li` show badge, title, date, place, capacity, buttons View/Participants/Edit/Publish/Delete
    - expect: Modal is usable, Save as draft visible, no horizontal overflow

### 3. 3. Validation (create form)

**Seed:** `tests/e2e/seed.spec.ts`

#### 3.1. Empty submit

**File:** `tests/e2e/event-management/validation-empty.spec.ts`

**Steps:**
  1. Open create modal and click 'Save as draft' with nothing filled
    - expect: Client shows only 'Upload a poster or image for the event.' and footer 'Please fix the highlighted fields.'; nothing sent
  2. Attach poster and submit again
    - expect: After 1-3 s server errors: title, description, event date, start time, end time, registration deadline, 'The location id field is required.', target participants, max participants (texts in Conventions); modal stays open; no event created

#### 3.2. End time not after start

**File:** `tests/e2e/event-management/validation-end-time.spec.ts`

**Steps:**
  1. Set start 09:00 and end 08:00, then end 09:00
    - expect: 'The end time must be after the start time.' for both

#### 3.3. Start in the past

**File:** `tests/e2e/event-management/validation-past-start.spec.ts`

**Steps:**
  1. Set Date to 2026-10-10 (and also today with an already-passed time)
    - expect: 'The event must start in the future.' under Date; submit blocked

#### 3.4. Deadline after start

**File:** `tests/e2e/event-management/validation-deadline-after.spec.ts`

**Steps:**
  1. Start 2026-11-20 09:00, deadline 2026-11-20T10:00
    - expect: 'The registration deadline must be on or before the event start.'

#### 3.5. Deadline in the past

**File:** `tests/e2e/event-management/validation-deadline-past.spec.ts`

**Steps:**
  1. Deadline 2026-10-01T10:00
    - expect: 'The registration deadline must be in the future.'

#### 3.6. Max participants limits

**File:** `tests/e2e/event-management/validation-max-participants.spec.ts`

**Steps:**
  1. With otherwise valid data submit Max participants 0, -1, 100001, 2.5 in turn (each needs a server round trip, wait for 'Save as draft' button to be idle)
    - expect: 0 and -1: 'The max participants field must be at least 1.'
    - expect: 100001: 'The max participants field must not be greater than 100000.'
    - expect: 2.5: 'The max participants field must be an integer.'
    - expect: Modal stays open each time

#### 3.7. Title is limited to 255 characters

**File:** `tests/e2e/event-management/validation-title-length.spec.ts`

**Steps:**
  1. Fill 'Event title' with 300 characters, then type more
    - expect: Input has maxlength 255; value length is 255 and cannot grow; no error text is shown (blocked by the input)

#### 3.8. Poster must be an image

**File:** `tests/e2e/event-management/validation-poster-type.spec.ts`

**Steps:**
  1. Set a text/plain a.txt file on the file input
    - expect: 'The poster must be a JPG, PNG or WEBP image.'; no preview

#### 3.9. Proof required with empty window

**File:** `tests/e2e/event-management/validation-proof-empty.spec.ts`

**Steps:**
  1. Check 'Require a proof photo' and click 'Save as draft'
    - expect: 'Set when proof photo uploads open.' and 'Set when proof photo uploads close.'

#### 3.10. Proof opens before event start

**File:** `tests/e2e/event-management/validation-proof-before-start.spec.ts`

**Steps:**
  1. Event starts 2026-11-20 09:00; set Uploads open 2026-11-20T08:00
    - expect: 'Proof uploads cannot open before the event starts.'

#### 3.11. Proof closes at or before opening

**File:** `tests/e2e/event-management/validation-proof-close.spec.ts`

**Steps:**
  1. Uploads open 2026-11-20T12:00; Uploads close 2026-11-20T12:00 then 11:00
    - expect: 'Proof uploads must close after they open.' for both

#### 3.12. Proof toggled off after filling window

**File:** `tests/e2e/event-management/validation-proof-off.spec.ts`

**Steps:**
  1. Check proof, fill a window, uncheck it, save as draft, open View
    - expect: Uploads open/close fields disappear and no proof errors; saves; PROOF PHOTO 'Not required'

#### 3.13. Edit: clearing the title

**File:** `tests/e2e/event-management/validation-edit-title.spec.ts`

**Steps:**
  1. Edit an event, clear 'Event title', click 'Save changes' and wait up to 5 s
    - expect: 'The title field is required.' with the title field aria-invalid; modal stays open

#### 3.14. Errors clear after fixing

**File:** `tests/e2e/event-management/validation-recover.spec.ts`

**Steps:**
  1. Trigger an end-time error, fix it, then save
    - expect: Error disappears as soon as the field is corrected; save succeeds with toast 'Event saved as draft successfully.'

### 4. 4. Lifecycle and public visibility

**Seed:** `tests/e2e/seed.spec.ts`

#### 4.1. Draft is not public

**File:** `tests/e2e/event-management/lifecycle-draft-private.spec.ts`

**Steps:**
  1. Create a draft; as a guest (fresh context, avoid closing it abruptly) open /events and /events/<id>
    - expect: /events does not list it; /events/<id> returns 404

#### 4.2. Publish with confirmation

**File:** `tests/e2e/event-management/lifecycle-publish.spec.ts`

**Steps:**
  1. Click `Publish <title>`
    - expect: Dialog 'Publish event?' text '<title> will become visible to students and guests.'
    - expect: Confirm 'Publish event': row leaves Drafts (URL unchanged), appears in Published, no Publish button, listed on /events, detail page loads

#### 4.3. Archive with confirmation

**File:** `tests/e2e/event-management/lifecycle-archive.spec.ts`

**Steps:**
  1. Click `Archive <title>` on a published event and confirm 'Archive event'
    - expect: Dialog text 'will be hidden from public lists and can no longer be edited. Its records, including registrations, are kept.'
    - expect: Toast 'Event archived successfully.'; row in Archived tab with Archived badge; View shows 'Kept for records and hidden from public lists.'
    - expect: /events hides it and /events/<id> is 404

#### 4.4. Cancelling publish/archive leaves status

**File:** `tests/e2e/event-management/lifecycle-cancel.spec.ts`

**Steps:**
  1. Open each confirm dialog and click Cancel
    - expect: Dialog closes; Publish (or Archive) button still present; counts unchanged

#### 4.5. Deleting a published event removes it publicly

**File:** `tests/e2e/event-management/lifecycle-delete-published.spec.ts`

**Steps:**
  1. Delete a published event and confirm
    - expect: Gone from admin list; /events no longer lists it; /events/<id> is 404

#### 4.6. Actions per status

**File:** `tests/e2e/event-management/lifecycle-actions.spec.ts`

**Steps:**
  1. Inspect row buttons in each tab
    - expect: Draft: View, Participants, Edit, Publish, Delete
    - expect: Published: View, Participants, Edit, Archive, Delete (Delete shown in the View dialog too)
    - expect: Archived: View, Participants, Delete (no Edit, no Publish, no Archive)

#### 4.7. Open status and guest detail

**File:** `tests/e2e/event-management/lifecycle-open.spec.ts`

**Steps:**
  1. Publish an event with future deadline/start; open /events and /events/<id> as guest
    - expect: Card shows 'Open', title, date, time, 'Palma Hall'
    - expect: Admin detail dialog says 'Published and accepting registrations.'

#### 4.8. Student sees published events only

**File:** `tests/e2e/event-management/lifecycle-student-view.spec.ts`

**Steps:**
  1. With one draft and one published event, loginAs student and open /events
    - expect: Only the published event appears (links 'Upcoming events' and 'My events' present); event page offers 'Register'

#### 4.9. Full status after last slot is taken

**File:** `tests/e2e/event-management/lifecycle-full.spec.ts`

**Steps:**
  1. Publish a max-1 event; as student open /events/<id>, click 'Register', then 'Confirm registration' (dialog says registrations cannot be cancelled); as admin reload list
    - expect: Student page shows 'You are registered' and '1 of 1 slots taken'; badge 'Full'
    - expect: Admin row capacity '1 / 1' with 'Full'; participants page lists 'Stu Student 26-99-001'; check-in page still shows 'The check-in code is shown only while the event is ongoing.'

### 5. 5. Access control

**Seed:** `tests/e2e/seed.spec.ts`

#### 5.1. Guest is redirected to login

**File:** `tests/e2e/event-management/access-guest.spec.ts`

**Steps:**
  1. In a signed-out context open /admin/events, /faculty/events, /admin/events/<id>/participants, /admin/events/<id>/check-in
    - expect: Each ends at /login

#### 5.2. Student is forbidden

**File:** `tests/e2e/event-management/access-student.spec.ts`

**Steps:**
  1. loginAs student; GET (page.request) /admin/events, /faculty/events, participants and check-in under both prefixes
    - expect: All return 403

#### 5.3. Faculty cannot use admin area

**File:** `tests/e2e/event-management/access-faculty-admin.spec.ts`

**Steps:**
  1. loginAs faculty; GET /admin/events and POST /admin/events with XSRF
    - expect: Both return 403

#### 5.4. Admin cannot use faculty area

**File:** `tests/e2e/event-management/access-admin-faculty.spec.ts`

**Steps:**
  1. As admin request /faculty/events (page.request, or goto if the console error is tolerated)
    - expect: 403 Forbidden, page title 'Forbidden'; no events UI

#### 5.5. Student cannot create or delete via API

**File:** `tests/e2e/event-management/access-student-api.spec.ts`

**Steps:**
  1. loginAs student; POST /admin/events and /faculty/events (multipart title) and DELETE /admin/events/<id> with XSRF header
    - expect: All 403; no event created and the event still exists
