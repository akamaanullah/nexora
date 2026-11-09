# QA / Verification — Second Edition

Tested in headless Google Chrome directly from `file://`, with no web server or remote assets.

## Results

- **82 main smoke assertions passed**: `tests/report.json`.
- **89 revision assertions passed**: `tests/revision-report.json`.
- **66 route/viewport typography audits passed**: visible HTML text never below 12.5px; SVG chart labels retain a rendered 13px size across viewport scales. Table text is 14px and body is 15.5px desktop.
- **20 additional checks passed** through `tests/extended.cjs`.
- **0 browser JavaScript errors, console errors or failed asset requests** in the main and revision suites.
- Desktop/tablet/mobile widths: **1600, 1440, 1024, 768, 390 and 320px**.
- Eleven screens, including the new lead page, checked for page-level overflow at every width. Wide tables, calendar and kanban remain contained and intentionally scrollable.
- Node syntax checks passed.
- Screenshot previews captured from a fresh, unmodified demo session.

## Revision-specific coverage

Role dropdown login for all three roles, native email validation, password toggle, full-page lead navigation from the table/board/tasks/queue/activity/search, contextual back navigation, browser back, direct route reload, unknown/unauthorized lead states, stage progress actions, comment/call/follow-up/note tabs, note separation, email preview, tags, role switching from a lead page and dark-mode lead layout.

Existing workflows also checked: filters, pagination, assignment, bulk edits, comments, simulated call timer/mute/disposition, task completion, calendar navigation, global search, notifications, theme persistence, profile/team edits, routing strategies, mock integrations and downloaded CSV.

## Screenshot files

`/screenshots/login.png`, `dashboard.png`, `leads.png`, `kanban.png`, `lead-detail.png`, `dashboard-dark.png`, `lead-detail-dark.png`, `mobile-dashboard.png`, `mobile-lead-detail.png`.

All are the updated UI. The lead-detail captures show an actual full page, not a drawer.

## Honest prototype boundaries

- UI-only role permissions are not production authorization.
- Sign-in is a local preview. Prefilled email/password are synthetic. Use no real credentials.
- No real external accounts, calls, audio, email/WhatsApp sending, webhooks or reminders.
- Historical charts/KPIs and leaderboard rankings are illustrative snapshots; lead lists, pipeline totals, notes, calls, tasks, tags and exports use reactive demo data.
- Demo edits reset on refresh; only theme preference is saved when browser storage permits.
- Clipboard permission may be blocked on local files; selectable text and Ctrl/⌘+C remain available.
- Safari/Firefox were not run here. A current Chromium browser is the verified experience.
