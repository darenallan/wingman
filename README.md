# Wingman

Assistant de conversation par IA. On colle le dernier message reçu (et un éventuel contexte), on choisit la situation et le ton voulu. Wingman propose plusieurs réponses courtes et naturelles, prêtes à envoyer.

## Fonctionnalités

- **Génération de réponses** calibrées selon la situation : `Match / Début`, `Flirt / Date`, `Couple`, `Ex / Froid`.
- **Choix du ton** (« vibe ») et contexte libre.
- **Historique** des générations et **favoris**.
- **Notes 👍 / 👎** sur les réponses : les mieux notées servent d'exemples aux générations suivantes (auto-apprentissage).
- **PWA** installable sur mobile.
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
cp .env.example .env      # DATABASE_URL, AI_API_KEY (AI_BASE_URL et AI_MODEL optionnels)
npm install
npm run dev               # http://localhost:3000. Le schéma (schema.sql) est appliqué au démarrage

# Interface (autre terminal)
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

## API

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/generate` | génère des réponses à partir de `herMessage`, `context`, `vibe`, `stage` |
| `POST` | `/api/feedback` | enregistre une note 👍 / 👎 sur une réponse |
| `GET` | `/api/history` | historique des générations |

## Configuration

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | PostgreSQL (TLS requis) |
| `AI_API_KEY` | clé du fournisseur d'IA |
| `AI_BASE_URL` | optionnel : endpoint compatible OpenAI |
| `AI_MODEL` | optionnel : modèle (par défaut `openai/gpt-oss-120b` sur Groq, `gemini-2.5-flash` sur Gemini, `gpt-4o-mini` sur OpenAI) |

## Déploiement

`render.yaml` décrit un service web unique. Le build compile le frontend puis installe le backend, et `npm start` lance l'API. Les secrets (`DATABASE_URL`, `AI_API_KEY`…) se renseignent dans le tableau de bord Render.

## Limites

Application personnelle **sans authentification** : l'historique et les routes de génération sont accessibles à toute personne qui connaît l'URL, et chaque génération consomme du crédit d'IA. Avant de la partager, il faut ajouter une authentification (ou au minimum un mot de passe) et une limitation de débit.
