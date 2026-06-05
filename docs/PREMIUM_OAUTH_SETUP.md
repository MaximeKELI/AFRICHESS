# OAuth & Stripe — mise en production

Guide pour activer la connexion Google/GitHub et les paiements Premium réels.

## OAuth (Google + GitHub)

### 1. Variables backend (`.env`)

```env
FRONTEND_URL=https://votre-domaine.com
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
```

### 2. Variables frontend

```env
NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api
NEXT_PUBLIC_API_ORIGIN=https://api.votre-domaine.com
NEXT_PUBLIC_OAUTH_ENABLED=true
```

### 3. Redirect URIs à enregistrer

| Provider | URI |
|----------|-----|
| Google | `https://api.votre-domaine.com/accounts/google/login/callback/` |
| GitHub | `https://api.votre-domaine.com/accounts/github/login/callback/` |

En local : `http://localhost:8000/accounts/{provider}/login/callback/`

### 4. Créer les SocialApp Django

Au démarrage, `ensure_oauth_apps()` enregistre les apps si les clés sont présentes.
Sinon :

```bash
docker exec africhess-backend-1 python manage.py shell -c "
from apps.users.social_setup import ensure_oauth_apps
ensure_oauth_apps()
"
```

### 5. Flux utilisateur

1. Clic « Google » / « GitHub » sur `/login`
2. Redirect vers `/accounts/{provider}/login/`
3. Callback allauth → JWT émis
4. Frontend `/auth/callback` stocke les tokens

---

## Stripe (Gold / Diamond)

### 1. Créer les produits Stripe

- **Gold** — 4,99 €/mois → copier le `price_...` ID
- **Diamond** — 9,99 €/mois → copier le `price_...` ID

### 2. Variables backend

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GOLD=price_...
STRIPE_PRICE_DIAMOND=price_...
FRONTEND_URL=https://votre-domaine.com
```

### 3. Webhook Stripe

URL : `https://api.votre-domaine.com/api/users/subscription/webhook/`

Événement : `checkout.session.completed`

### 4. Vérification

```bash
curl -s http://localhost:8000/api/users/subscription/plans/ | jq .stripe_enabled
# true si Stripe est configuré
```

Sans clés Stripe : le bouton Premium active **30 jours démo** (développement uniquement).

---

## Checklist production

- [ ] `DEBUG=False`, `SECRET_KEY` unique
- [ ] `CORS_ALLOWED_ORIGINS` inclut le frontend
- [ ] `ALLOWED_HOSTS` inclut l'API
- [ ] OAuth redirect URIs validés
- [ ] Webhook Stripe testé (Stripe CLI : `stripe listen --forward-to localhost:8000/api/users/subscription/webhook/`)
- [ ] `NEXT_PUBLIC_OAUTH_ENABLED=true` en production
