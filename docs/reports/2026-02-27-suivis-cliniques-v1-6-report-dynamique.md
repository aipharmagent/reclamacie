# 2026-02-27 — Suivis cliniques V1.6 (report dynamique + espace tableau)

## Changements appliqués
- Retrait du bouton **Note** (édition inline conservée uniquement).
- Ajout d’un champ **Jours de report** (valeur utilisateur) dans Filtres & outils.
- **Reporter** utilise maintenant le nombre de jours choisi (pas seulement +1j).
- **Rattrapage en retard** utilise aussi le nombre de jours choisi.
- Agrandissement de l’espace de la section **Suivis** à droite sur grand écran.

## Détails UX
- Le libellé du bouton devient dynamique: `Reporter +Xj` selon la valeur choisie.
- Les confirmations de rattrapage indiquent explicitement `+X jour(s)`.

## Fichiers modifiés
- `outils/suivis-cliniques/index.html`
- `outils/suivis-cliniques/app.js`
- `outils/suivis-cliniques/styles.css`

## Portée
✅ Aucun autre outil/page existant modifié.
