-- Script SQL pour Neon (PostgreSQL Serverless)
CREATE TABLE IF NOT EXISTS wingman_history (
    id SERIAL PRIMARY KEY,
    context TEXT,
    her_message TEXT NOT NULL,
    target_vibe VARCHAR(50),
    ai_response JSONB NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wingman_created_at ON wingman_history(created_at DESC);
