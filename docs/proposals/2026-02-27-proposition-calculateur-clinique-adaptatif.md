# Proposition — Calculateur clinique adaptatif (pharmacie communautaire)

## Tool name
**Calculateur clinique adaptatif — Reclamacie**

## Problem it solves
En officine, les calculs utiles (pédiatrie, anti-infectieux, doses mg/kg, conversions simples) sont dispersés entre mémoire, outils externes et feuilles de calcul. Cela augmente le temps de validation et le risque d’erreur de saisie.

## Why it matters for Quebec pharmacists
Un outil centralisé, rapide, imprimable et orienté pratique communautaire améliore la fluidité au comptoir, la cohérence de vérification et la sécurité opérationnelle.

## How it improves workflow or revenue
- Réduction du temps de calcul au comptoir
- Diminution des erreurs de conversion (mg ↔ mL, max dose)
- Meilleure standardisation des vérifications cliniques
- Plus de capacité pour actes cliniques à valeur

## Simple description of the tool/page
Page unique avec sélection du **type de calculateur**, puis formulaire dynamique selon la molécule/groupe choisi.

MVP inclus:
1. Pédiatrique mg/kg/jour (dose + volume)
2. Pyrantel (dose totale + volume)
3. Antibiotique pédiatrique (amoxicilline initialement)
4. Warfarine (aide structurée non prescriptive)
5. Méthadone (aide conversion basique + avertissements)
6. Calculateur personnalisé « autre » (mg/kg)

## How it will be added WITHOUT touching existing tools
Ajout uniquement de nouveaux fichiers:
- `/outils/calculateurs-cliniques/index.html`
- `/outils/calculateurs-cliniques/styles.css`
- `/outils/calculateurs-cliniques/app.js`

Aucun outil existant modifié.

## Estimated complexity
**Medium** (UI dynamique + logique par calculateur + garde-fous)

---
Statut: **Approuvé par le propriétaire (go-ahead)**
