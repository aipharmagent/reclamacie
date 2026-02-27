# Proposition — Registre de suivis cliniques (PL31/PL41/PL67-ready)

## Tool name
**Registre de suivis cliniques Québec (standalone)**

## Problem it solves
En pharmacie communautaire, les suivis sont souvent dispersés (papier, notes libres, mémoire d’équipe, PMS local), ce qui crée:
- rappels manqués (ex. réévaluation après ajustement/renouvellement),
- documentation incomplète lors de vérifications,
- difficulté à prioriser les patients à risque,
- perte de temps pour retrouver l’historique d’intervention.

## Why it matters for Quebec pharmacists
Le cadre québécois (PL41, PL31 et l’élargissement progressif attendu avec PL67) augmente le volume d’actes cliniques, de suivis et d’obligations documentaires. Un registre structuré et rapide réduit le risque de suivi incomplet et soutient une pratique sécuritaire, traçable et efficace.

## How it improves workflow or revenue
- **Gain de temps**: vue unique des suivis à faire (aujourd’hui/7 jours/en retard).
- **Meilleure exécution clinique**: rappels et statut par patient/intervention.
- **Qualité documentaire**: champs standardisés (motif, acte, date de suivi, issue).
- **Impact financier indirect**: meilleure cadence d’actes cliniques réalisés + moins de pertes d’opportunités de suivi.

## Simple description of the tool/page
Nouvelle page autonome permettant de:
1. Ajouter un suivi patient lié à un acte (renouvellement, ajustement, condition mineure, etc.).
2. Assigner une date d’échéance + priorité.
3. Changer le statut (À faire, En cours, Complété, Escaladé).
4. Filtrer par échéance/priorité/type d’acte.
5. Imprimer une liste quotidienne de suivis.

Version 1 = localStorage (aucun impact serveur), interface légère et imprimable.

## How it will be added WITHOUT touching existing tools
- Ajouter **uniquement** de nouveaux fichiers dans une section séparée, par exemple:
  - `/outils/suivis-cliniques/index.html`
  - `/outils/suivis-cliniques/styles.css`
  - `/outils/suivis-cliniques/app.js`
- Aucun fichier existant modifié.
- Aucun remplacement de pages existantes.
- Accès possible par URL directe au départ (sans brancher la navigation existante).

## Estimated complexity
**Low → Medium** (front-end standalone, sans migration ni dépendance backend)

## Notes de recherche initiale (pratique)
Axes prioritaires observés pour la pharmacie QC:
- suivi post-intervention (48h/7j/30j selon cas),
- uniformisation de la documentation,
- tri des priorités cliniques au quart de travail,
- traçabilité simple en cas d’audit interne/externe.

---
**Statut:** En attente d’approbation avant toute implémentation.
