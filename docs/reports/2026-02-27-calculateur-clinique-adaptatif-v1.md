# 2026-02-27 — Calculateur clinique adaptatif V1

## What was built
New standalone tool:
- `/outils/calculateurs-cliniques/index.html`
- `/outils/calculateurs-cliniques/styles.css`
- `/outils/calculateurs-cliniques/app.js`

Homepage access added:
- New button in Gabarits on `index.html`:
  - **Calculateur clinique adaptatif**

## Calculators included (MVP)
1. Pédiatrique mg/kg/jour (générique)
2. Pyrantel
3. Amoxicilline pédiatrique
4. Warfarine (aide structurée)
5. Méthadone (aide conversion basique)
6. Autre médicament (mg/kg)

## Why it helps pharmacists
- Centralizes frequent retail-pharmacy calculations
- Reduces mg↔mL and dosing arithmetic friction
- Supports fast, consistent workflow at the bench

## Access/test
- `https://reclamacie.com/outils/calculateurs-cliniques/`
- Or via homepage Gabarits button

## Validation
- JS syntax check passed (`node --check`)
- Manual logic pass on all calculator modes

## Files added/changed
- `docs/proposals/2026-02-27-proposition-calculateur-clinique-adaptatif.md`
- `outils/calculateurs-cliniques/index.html`
- `outils/calculateurs-cliniques/styles.css`
- `outils/calculateurs-cliniques/app.js`
- `index.html` (new navigation button only)
- `docs/reports/2026-02-27-calculateur-clinique-adaptatif-v1.md`

## Safety scope
✅ Existing tools were not modified in logic.
✅ Changes are isolated to new standalone section + one homepage link.
