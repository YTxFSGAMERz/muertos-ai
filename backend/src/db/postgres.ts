import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err);
});

export async function initPostgres() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tributes (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name          TEXT NOT NULL,
        birth_year    INTEGER,
        death_year    INTEGER,
        relationship  TEXT,
        story         TEXT,
        narrative     TEXT,
        voice_url     TEXT,
        mongo_id      TEXT,
        embedding     vector(768),
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS tributes_embedding_idx
        ON tributes USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10)
    `).catch(() => {
      // Index creation may fail if table is empty; that's OK for local dev
    });
    console.log('✅ PostgreSQL initialized with pgvector');
  } finally {
    client.release();
  }
}

/** Store a tribute with its embedding vector */
export async function insertTribute(params: {
  name: string;
  birth_year?: number;
  death_year?: number;
  relationship?: string;
  story?: string;
  narrative?: string;
  voice_url?: string;
  mongo_id?: string;
  embedding?: number[];
}) {
  const { name, birth_year, death_year, relationship, story, narrative, voice_url, mongo_id, embedding } = params;
  const embeddingStr = embedding ? `[${embedding.join(',')}]` : null;

  const result = await pool.query(
    `INSERT INTO tributes (name, birth_year, death_year, relationship, story, narrative, voice_url, mongo_id, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
     RETURNING id`,
    [name, birth_year, death_year, relationship, story, narrative, voice_url, mongo_id, embeddingStr]
  );
  return result.rows[0].id as string;
}

/** Semantic search via pgvector cosine similarity */
export async function semanticSearch(queryEmbedding: number[], limit = 5) {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const result = await pool.query(
    `SELECT id, name, birth_year, death_year, relationship, narrative,
            1 - (embedding <=> $1::vector) AS similarity
     FROM tributes
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [embeddingStr, limit]
  );
  return result.rows;
}

/** Get tribute by ID */
export async function getTributeById(id: string) {
  const result = await pool.query('SELECT * FROM tributes WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/** Cache era memories to avoid redundant SerpApi calls */
export async function cacheEraMemories(yearRange: string, data: object) {
  await pool.query(
    `INSERT INTO era_memories (year_range, events, songs, news)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (year_range) DO UPDATE SET events = $2, songs = $3, news = $4, cached_at = NOW()`,
    [yearRange, JSON.stringify((data as any).events), JSON.stringify((data as any).songs), JSON.stringify((data as any).news)]
  );
}

export async function getCachedEraMemories(yearRange: string) {
  const result = await pool.query(
    'SELECT * FROM era_memories WHERE year_range = $1 AND cached_at > NOW() - INTERVAL \'7 days\'',
    [yearRange]
  );
  return result.rows[0] || null;
}

export default pool;
