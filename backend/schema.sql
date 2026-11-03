-- Script SQL pour Neon (PostgreSQL Serverless)
-- Exécuté automatiquement au démarrage de server.js (idempotent)
CREATE TABLE IF NOT EXISTS wingman_history (
    id SERIAL PRIMARY KEY,
    context TEXT,
    her_message TEXT NOT NULL,
    target_vibe VARCHAR(50),
    ai_response JSONB NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE wingman_history ADD COLUMN IF NOT EXISTS stage VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_wingman_created_at ON wingman_history(created_at DESC);

-- Notes 👍/👎 sur les réponses générées (auto-apprentissage)
CREATE TABLE IF NOT EXISTS wingman_feedback (
    id SERIAL PRIMARY KEY,
    stage VARCHAR(50),
    vibe VARCHAR(50),
    her_message TEXT NOT NULL,
    chosen_reply TEXT NOT NULL,
    rating SMALLINT NOT NULL, -- 1 pour 👍, -1 pour 👎
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_rating_created ON wingman_feedback(rating, created_at DESC);
