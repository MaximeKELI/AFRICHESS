# Module Apprentissage (`apps.learning`)

## Architecture

| Composant | Rôle |
|-----------|------|
| `Course`, `Lesson`, `Quiz`, `UserProgress` | Parcours pédagogique |
| `LearningProfile`, `Badge`, `UserBadge` | XP, niveaux, badges |
| `pgn_analysis.py` | Analyse Stockfish + texte FR |
| `puzzle_adaptive.py` | Délègue à `apps.puzzles` (pas de doublon) |
| `coach.py` | Conseils selon stats / thèmes puzzles |
| `progression.py` | Attribution XP |

## API (`/api/learning/`)

- `GET dashboard/` — vue d'ensemble
- `GET courses/`, `GET courses/{slug}/`
- `POST courses/{slug}/complete-lesson/`
- `GET quizzes/{id}/`, `POST quizzes/{id}/submit/`
- `POST analyze/` — body `{ "pgn": "..." }`
- `GET puzzles/daily/`, `GET puzzles/adaptive/`, `POST puzzles/{id}/attempt/`
- `GET coach/`, `GET profile/`, `GET badges/mine/`

## Initialisation

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_learning
```

## Frontend

- `/learning` — dashboard
- `/learning/courses/[slug]` — cours + quiz
- `/learning/analyze` — analyse PGN
