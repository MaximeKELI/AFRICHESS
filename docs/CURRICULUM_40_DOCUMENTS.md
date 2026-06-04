# Curriculum AFRICHESS — 40 documents (~20 pages)

## Vue d'ensemble

| Métrique | Valeur |
|----------|--------|
| Volumes (cours) | **10** |
| Documents (leçons) | **40** |
| Mots par document (moyenne) | **~6 300** (~20 pages à 300 mots/page) |
| Mots total | **~250 000** |

## Les 10 volumes

1. **Découverte** — histoire, échiquier, premiers coups, éthique  
2. **Notation et règles** — SAN, coups spéciaux, mat/pat, valeur des pièces  
3. **Principes** — centre, développement, roi, plans  
4. **Ouvertures 1** — italienne, espagnole, gambit dame, anglaise  
5. **Ouvertures 2** — sicilienne, française, damier, indiennes  
6. **Tactique** — fourchettes, clouages, mats, calcul  
7. **Stratégie** — structures, cases faibles, pièces majeures, attaque  
8. **Finales** — opposition, pions, tours, dames  
9. **Compétition** — temps, préparation, analyse, psychologie  
10. **Maîtrise AFRICHESS** — ELO, puzzles, IA, scène africaine  

## Fichiers

- Manifeste : `backend/apps/learning/curriculum/manifest.json`  
- Contenu FR : `backend/apps/learning/curriculum/fr/*.md`  
- Générateur : `backend/apps/learning/curriculum/builder.py` + `enrich.py`  

## Commandes

```bash
# Regénérer les 40 markdown (~6338 mots/doc)
cd backend/apps/learning/curriculum && python3 builder.py

# Charger en base Django
docker compose exec backend python manage.py seed_full_curriculum --regenerate
```

## Frontend

- `/learning` — liste des 10 cours  
- `/learning/courses/<slug>` — leçons avec sommaire et compteur de pages  
