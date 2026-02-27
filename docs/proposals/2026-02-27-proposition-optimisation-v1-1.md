# Proposition — Optimisation V1.1 (fiabilité opérationnelle)

## Tool name
**Suivis cliniques V1.1 — anti-doublons + rattrapage des retards**

## Problem it solves
Après usage initial, deux irritants nuisent à l’exécution:
- risque de créer/importer des doublons (même Rx/acte/date),
- charge mentale élevée pour replanifier les suivis en retard un par un.

## Why it matters for Quebec pharmacists
En pratique réelle, le volume de suivis augmente vite; les doublons et retards brouillent la liste d’actions cliniques et font perdre du temps au quart de travail.

## How it improves workflow or revenue
- Réduit le bruit dans la liste (moins de doublons, plus de clarté).
- Accélère la reprise d’un backlog de suivis manqués.
- Favorise une exécution quotidienne plus constante (moins d’actes oubliés).

## Simple description of the tool/page
Ajout de 3 optimisations dans la page existante `/outils/suivis-cliniques/`:
1. Avertissement de doublon probable à la création manuelle.
2. Déduplication automatique post-import JSON/CSV.
3. Action de rattrapage en masse: repousser d’1 jour tous les suivis en retard.

## How it will be added WITHOUT touching existing tools
- Modification uniquement de:
  - `/outils/suivis-cliniques/index.html`
  - `/outils/suivis-cliniques/app.js`
- Aucun impact sur les outils/pages historiques de reclamacie.com.

## Estimated complexity
**Low**

---
**Statut:** Auto-exécution dans la boucle d’optimisation autonome demandée par le propriétaire.
