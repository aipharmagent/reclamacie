# 2026-02-27 — Suivis cliniques V1.8 (report via prompt + taille note)

## Changements appliqués
- Retrait du champ **Jours de report** dans "Filtres & outils".
- Bouton **Reporter** (ligne Suivis): ouvre maintenant une petite fenêtre demandant le nombre de jours.
- Bouton **Rattrapage en retard**: ouvre aussi une petite fenêtre demandant le nombre de jours.
- Ajustement de la colonne **Note** pour éviter qu’elle dépasse visuellement la ligne/tableau:
  - largeur max contrôlée,
  - retour à la ligne naturel,
  - réduction de l’emprise visuelle.

## Fichiers modifiés
- `outils/suivis-cliniques/index.html`
- `outils/suivis-cliniques/app.js`
- `outils/suivis-cliniques/styles.css`
