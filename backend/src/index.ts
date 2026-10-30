/**
 * Muertos.ai API Server
 * Built with Hono — fast, lightweight, edge-ready
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { Client, Connection } from '@temporalio/client';
import { initPostgres, semanticSearch, getTributeById } from './db/postgres.js';
import { initMongo, createOfrenda, getAllOfrendas, getOfrendaByWorkflowId } from './db/mongo.js';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import dotenv from 'dotenv';
import { join } from 'path';
import { mkdirSync } from 'fs';

dotenv.config();

const app = new Hono();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));

// Serve audio files
mkdirSync(join(process.cwd(), 'public', 'audio'), { recursive: true });
app.use('/audio/*', serveStatic({ root: './public' }));

// Health check
app.get('/health', (c) => c.json({ status: 'alive', spirit: '🕯️', timestamp: new Date().toISOString() }));

// ─── Ofrenda Routes ──────────────────────────────────────────────────────────

/** POST /api/ofrenda/create — Start the Temporal workflow */
app.post('/api/ofrenda/create', async (c) => {
  try {
    const body = await c.req.json();
    const { name, birth_year, death_year, relationship, story } = body;

    if (!name?.trim()) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Pre-create MongoDB document so we can track status immediately
    const mongoId = await createOfrenda({
      name: name.trim(),
      birth_year: birth_year ? Number(birth_year) : undefined,
      death_year: death_year ? Number(death_year) : undefined,
      relationship: relationship?.trim(),
      story: story?.trim(),
      status: 'pending',
    });

    // Connect to Temporal and start workflow
    let workflowId: string;
    try {
      const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      });
      const client = new Client({ connection, namespace: process.env.TEMPORAL_NAMESPACE || 'default' });

      workflowId = `ofrenda-${mongoId}`;
      await client.workflow.start('ofrendaWorkflow', {
        taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ofrenda-queue',
        workflowId,
        args: [{ name: name.trim(), birth_year, death_year, relationship, story, mongo_id: mongoId }],
      });

      console.log(`🕯️ Started workflow ${workflowId} for ${name}`);
    } catch (temporalErr) {
      // Fallback: run without Temporal (direct execution for demo)
      console.warn('⚠️  Temporal not available — running inline:', temporalErr);
      workflowId = `inline-${mongoId}`;
      runInline({ name, birth_year, death_year, relationship, story, mongo_id: mongoId }).catch(console.error);
    }

    return c.json({ workflow_id: workflowId, mongo_id: mongoId, status: 'pending' }, 201);
  } catch (err: any) {
    console.error('Create ofrenda error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/** GET /api/ofrenda/:workflowId/status — Poll workflow status */
app.get('/api/ofrenda/:workflowId/status', async (c) => {
  const workflowId = c.req.param('workflowId');
  try {
    const doc = await getOfrendaByWorkflowId(workflowId);
    if (!doc) return c.json({ error: 'Not found' }, 404);
    return c.json({
      status: doc.status,
      mongo_id: doc._id?.toString(),
      name: doc.name,
      narrative: doc.status === 'complete' ? doc.narrative : undefined,
      voice_url: doc.status === 'complete' ? doc.voice_url : undefined,
      historical_context: doc.status === 'complete' ? doc.historical_context : undefined,
      error: doc.error_message,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/** GET /api/ofrenda/all — List all completed ofrendas */
app.get('/api/ofrenda/all', async (c) => {
  try {
    const ofrendas = await getAllOfrendas(20);
    return c.json({ ofrendas: ofrendas.map(o => ({
      id: o._id?.toString(),
      name: o.name,
      birth_year: o.birth_year,
      death_year: o.death_year,
      relationship: o.relationship,
      narrative: o.narrative,
      voice_url: o.voice_url,
      historical_context: o.historical_context,
      created_at: o.created_at,
    }))});
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

/** GET /api/ofrenda/search?q=... — Semantic search via Tiger Data (pgvector) */
app.get('/api/ofrenda/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json({ error: 'Query required' }, 400);

  try {
    const embModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embResult = await embModel.embedContent({
      content: { parts: [{ text: query }], role: 'user' },
      taskType: TaskType.SEMANTIC_SIMILARITY,
    });
    const results = await semanticSearch(embResult.embedding.values, 5);
    return c.json({ results, query });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── Inline fallback (when Temporal not running) ─────────────────────────────
async function runInline(input: {
  name: string; birth_year?: number; death_year?: number;
  relationship?: string; story?: string; mongo_id: string;
}) {
  const { fetchEraMemories, generateNarrative, generateVoice, storeOfrenda } = await import('./temporal/activities/index.js');
  try {
    const era = await fetchEraMemories(input as any);
    const narrative = await generateNarrative({ ...input, era_memories: era } as any);
    const voice = await generateVoice({ narrative: narrative.narrative, name: input.name, mongo_id: input.mongo_id });
    await storeOfrenda({ input: input as any, narrative, voice, era_memories: era });
    console.log(`✨ Inline ofrenda complete for ${input.name}`);
  } catch (err) {
    const { updateOfrenda } = await import('./db/mongo.js');
    await updateOfrenda(input.mongo_id, { status: 'error', error_message: String(err) }).catch(console.error);
    console.error('Inline ofrenda failed:', err);
  }
}

// ─── Start server ─────────────────────────────────────────────────────────────
async function main() {
  await initPostgres().catch(err => console.warn('⚠️  Postgres unavailable:', err.message));
  await initMongo().catch(err => console.warn('⚠️  MongoDB unavailable:', err.message));

  const port = Number(process.env.PORT || 3001);
  serve({ fetch: app.fetch, port }, () => {
    console.log(`\n🎃 Muertos.ai API running on http://localhost:${port}`);
    console.log(`   Health: http://localhost:${port}/health`);
    console.log(`   Create: POST http://localhost:${port}/api/ofrenda/create`);
  });
}

main().catch(err => { console.error('Server failed:', err); process.exit(1); });
