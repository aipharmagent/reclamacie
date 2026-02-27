# 2026-02-27 — Suivis cliniques V1.1 (optimisation)

## What was improved
Optimisations appliquées sur le module standalone existant:
- Détection de doublon probable lors de l’ajout manuel (Rx + Ref + Acte + Date).
- Déduplication automatique lors d’un import JSON/CSV.
- Nouveau bouton: **Rattrapage en retard (+1j)** pour repousser en masse les suivis non complétés en retard.
- Nouveau bouton: **Nettoyer doublons** pour assainir rapidement la base locale.

## Why it helps pharmacists
- Moins de bruit opérationnel = meilleure priorisation clinique.
- Réduction du risque d’actions répétées inutilement.
- Gestion du backlog plus rapide pendant les périodes chargées.

## How to access/test
- URL: `https://reclamacie.com/outils/suivis-cliniques/`

Quick validation:
1. Ajouter un suivi, puis retenter un suivi identique → alerte de doublon.
2. Importer un fichier contenant des lignes répétées → doublons ignorés.
3. Mettre des éléments en retard, cliquer **Rattrapage en retard (+1j)** → dates décalées.
4. Cliquer **Nettoyer doublons** → suppression des entrées dupliquées restantes.

## Files changed (module only)
- `outils/suivis-cliniques/index.html`
- `outils/suivis-cliniques/app.js`
- `docs/proposals/2026-02-27-proposition-optimisation-v1-1.md`
- `docs/reports/2026-02-27-suivis-cliniques-v1-1.md`

## Confirmation no existing tools changed
✅ Aucun outil/page historique de reclamacie.com modifié.
✅ Changements limités au module standalone `/outils/suivis-cliniques/` et à la documentation.

## Next optimization ideas
1. Mapping assisté des colonnes Google Sheets (import sans friction).
2. Vue "Actions du jour" avec ordre intelligent (retard > aujourd’hui > proche échéance).
3. Raccourcis clavier pour saisie rapide en service.
4. Présets par type d’acte (intervalles/suivis par défaut).
