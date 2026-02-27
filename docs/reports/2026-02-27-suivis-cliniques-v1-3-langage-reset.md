# 2026-02-27 — Suivis cliniques V1.3 (langage + réinitialisation)

## Ajustements demandés et appliqués
- Retrait de la mention en haut: "Standalone · Québec · PL31/PL41/PL67-ready · sauvegarde locale".
- Menu **Acte** remplacé par:
  - ajustement
  - cesser
  - suivi clinique
  - deprescription
  - opinion
  - autre
- Le champ **Date** est maintenant prérempli automatiquement à la date du jour.
- Retrait de la note: "Conseil: export JSON quotidien...".
- Ajout d’un bouton **Réinitialiser les données** avec avertissement de confirmation avant effacement.
- Libellés améliorés en français:
  - Exporter JSON
  - Exporter CSV
  - Importer (JSON/CSV)

## Portée
- Fichiers touchés uniquement dans le module standalone:
  - `outils/suivis-cliniques/index.html`
  - `outils/suivis-cliniques/app.js`

## Sécurité des outils existants
✅ Aucun autre outil/page existant de reclamacie.com n’a été modifié.
