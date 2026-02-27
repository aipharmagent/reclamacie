# 2026-02-27 — Suivis cliniques V1

## What was built
New standalone tool section:
- `/outils/suivis-cliniques/index.html`
- `/outils/suivis-cliniques/styles.css`
- `/outils/suivis-cliniques/app.js`

Core capabilities delivered:
- Follow-up entry form with your workflow fields (date, Rx #, ref #, acte, interval, status, initials, note, planned follow-up count).
- Automatic generation of follow-up dates based on interval + number planned.
- Priority/urgency logic (overdue/today/soon/completed).
- Dashboard KPIs (total, overdue, due today, completed).
- Action queue controls per row: mark follow-up done, postpone (+1 day), cycle status, delete.
- Filters (search, status, due window, initials).
- Export in **JSON** and **CSV**.
- Import from **JSON** and **CSV** with merge or full replace mode.
- Printable daily view.

## Why it helps pharmacists
- Reduces missed follow-ups through explicit overdue/today focus.
- Standardizes documentation fields for faster and more consistent intervention tracking.
- Speeds daily triage by surfacing what is actionable now.
- Supports backup/restore continuity using JSON and CSV import/export.

## How to access/test
URL/path:
- `https://reclamacie.com/outils/suivis-cliniques/`
  (or directly from server path above)

Recommended test script:
1. Add 2-3 follow-ups with different intervals/statuses.
2. Confirm next due date auto-calculation.
3. Mark one as "Suivi fait" and verify progression updates.
4. Use due filter "En retard" / "Aujourd'hui".
5. Export JSON and CSV.
6. Re-import JSON (merge mode), then CSV (replace mode) to verify restore flow.
7. Print view to validate one-page readability.

## Files added
- `docs/proposals/2026-02-27-proposition-registre-suivis-pharmaciens-qc.md`
- `outils/suivis-cliniques/index.html`
- `outils/suivis-cliniques/styles.css`
- `outils/suivis-cliniques/app.js`
- `docs/reports/2026-02-27-suivis-cliniques-v1.md`

## Confirmation no existing tools changed
✅ No existing tool/page was edited by this implementation.
✅ Only new files/folders were added.

## Next improvement ideas
1. Optional browser local reminders at opening times and shift intervals.
2. Configurable follow-up templates by acte (default intervals/counts).
3. Import mapper for Google Sheets column headers (guided mapping wizard).
4. Team mode (shared backend) with initials-level activity tracking.
5. Missed-follow-up recovery assistant (bulk reschedule with rules).
