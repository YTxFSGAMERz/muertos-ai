-- Muertos.ai PostgreSQL + pgvector schema
-- Run with Tiger Data or any Postgres 15+ instance

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main tributes table with semantic search via pgvector
CREATE TABLE IF NOT EXISTS tributes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  birth_year    INTEGER,
  death_year    INTEGER,
  relationship  TEXT,
  story         TEXT,
  narrative     TEXT,          -- Gemma-generated memorial narrative
  voice_url     TEXT,          -- ElevenLabs audio URL
  mongo_id      TEXT,          -- Reference to MongoDB document
  embedding     vector(768),   -- Gemma text-embedding-004 dimension
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS tributes_embedding_idx
  ON tributes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for full-text search
CREATE INDEX IF NOT EXISTS tributes_name_idx ON tributes USING gin(to_tsvector('english', name));

-- Historical context cache to avoid redundant SerpApi calls
CREATE TABLE IF NOT EXISTS era_memories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year_range TEXT NOT NULL UNIQUE,  -- e.g. "1940-1980"
  events     JSONB,
  songs      JSONB,
  news       JSONB,
  cached_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS era_memories_year_range_idx ON era_memories (year_range);
