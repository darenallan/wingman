# Wingman

Assistant de conversation par IA. On colle le dernier message reçu (et un éventuel contexte), on choisit la situation et le ton voulu. Wingman propose plusieurs réponses courtes et naturelles, prêtes à envoyer.

## Fonctionnalités

- **Génération de réponses** calibrées selon la situation : `Match / Début`, `Flirt / Date`, `Couple`, `Ex / Froid`.
- **Choix du ton** (« vibe ») et contexte libre.
- **Historique** des générations et **favoris**.
- **Notes 👍 / 👎** sur les réponses : les mieux notées servent d'exemples aux générations suivantes (auto-apprentissage).
- **PWA** installable sur mobile.
- **Accès protégé** par mot de passe, avec limitation de débit (voir « Sécurité »).
- **Fournisseur d'IA au choix**, détecté par le préfixe de la clé : Groq (`gsk_…`), Gemini (`AIza…`) ou OpenAI (`sk-…`), ou tout endpoint compatible via `AI_BASE_URL`.

## Stack

| Partie | Technologies |
|---|---|
| `frontend/` | React 19, Vite, Tailwind CSS, lucide-react |
| `backend/` | Node.js, Express, PostgreSQL (Neon) via `pg` |

En production, le backend sert aussi le build du frontend : un seul service Render, décrit dans `render.yaml`.

## Démarrer en local

Prérequis : Node.js 20+, une base PostgreSQL (Neon ou locale) et une clé d'API d'IA.

```bash
# API
cd backend
cp .env.example .env      # WINGMAN_PASSWORD, SESSION_SECRET, DATABASE_URL, AI_API_KEY
npm install
npm run dev               # http://localhost:3000. Le schéma (schema.sql) est appliqué au démarrage

# Interface (autre terminal)
cd frontend
npm install
npm run dev               # /api est proxifié vers http://localhost:3000
```

## API

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/login` | ouvre une session (`{ "password": "…" }`) |
| `POST` | `/api/logout` | ferme la session |
| `GET` | `/api/session` | indique si la session est ouverte |
| `POST` | `/api/generate` | génère des réponses à partir de `herMessage`, `context`, `vibe`, `stage` |
| `POST` | `/api/feedback` | enregistre une note 👍 / 👎 sur une réponse |
| `GET` | `/api/history` | historique des générations |

## Configuration

| Variable | Rôle |
|---|---|
| `WINGMAN_PASSWORD` | mot de passe de l'app, 12 caractères minimum (**obligatoire**) |
| `SESSION_SECRET` | secret de signature des sessions, 32 caractères minimum (**obligatoire**, `openssl rand -base64 48`) |
| `GENERATE_DAILY_LIMIT` | optionnel : générations maximales par jour, tous appareils confondus (défaut 300) |
| `DATABASE_URL` | PostgreSQL (TLS requis) |
| `AI_API_KEY` | clé du fournisseur d'IA |
| `AI_BASE_URL` | optionnel : endpoint compatible OpenAI |
| `AI_MODEL` | optionnel : modèle (par défaut `openai/gpt-oss-120b` sur Groq, `gemini-2.5-flash` sur Gemini, `gpt-4o-mini` sur OpenAI) |

## Déploiement

`render.yaml` décrit un service web unique. Le build compile le frontend puis installe le backend, et `npm start` lance l'API. Render génère `SESSION_SECRET`. Les autres secrets (`WINGMAN_PASSWORD`, `DATABASE_URL`, `AI_API_KEY`…) se renseignent dans le tableau de bord Render.

## Sécurité

- **Mot de passe unique** comparé en temps constant. Une connexion réussie ouvre une session de 30 jours dans un cookie `HttpOnly`, `SameSite=Strict` et `Secure` en production, signé en HMAC-SHA256.
- **Fail closed** : sans `WINGMAN_PASSWORD` ni `SESSION_SECRET` valides, le serveur refuse de démarrer.
- **Routes protégées** : `/api/generate`, `/api/feedback` et `/api/history` renvoient 401 sans session valide.
- **Pas de CORS**, et les requêtes venant d'une autre origine sont refusées (403).
- **Limitation de débit** :
  - connexion : 5 essais par 15 minutes et par IP ;
  - génération : 30 par 10 minutes et par IP, et un plafond quotidien global (`GENERATE_DAILY_LIMIT`) pour borner la facture d'IA.
- **Entrées bornées** : corps de 32 Ko au maximum, message et contexte de 4 000 caractères au maximum. En-têtes `nosniff`, `X-Frame-Options: DENY` et `Referrer-Policy: no-referrer`.

Les compteurs sont en mémoire : ils valent pour une instance unique et repartent à zéro au redémarrage. Avec plusieurs instances, il faudrait un stockage partagé (Redis).

```bash
cd backend && npm test     # tests du module de sécurité
```
