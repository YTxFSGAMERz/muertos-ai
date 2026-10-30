import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { insertTribute, semanticSearch } from '../../db/postgres.js';
import { createOfrenda, updateOfrenda } from '../../db/mongo.js';

export const memoryStoreTool = createTool({
  id: 'store_ofrenda',
  description: 'Store the complete ofrenda in Tiger Data (pgvector) and MongoDB Atlas',
  inputSchema: z.object({
    name: z.string(),
    birth_year: z.number().optional(),
    death_year: z.number().optional(),
    relationship: z.string().optional(),
    story: z.string().optional(),
    narrative: z.string(),
    voice_url: z.string().optional(),
    embedding: z.array(z.number()),
    historical_context: z.object({
      events: z.array(z.string()),
      songs: z.array(z.string()),
      news: z.array(z.string()),
      era_summary: z.string(),
    }).optional(),
    temporal_workflow_id: z.string().optional(),
  }),
  outputSchema: z.object({
    postgres_id: z.string(),
    mongo_id: z.string(),
  }),
  execute: async ({ context }) => {
    const { name, birth_year, death_year, relationship, story, narrative,
      voice_url, embedding, historical_context, temporal_workflow_id } = context;

    // Store in MongoDB Atlas (rich document store)
    const mongoId = await createOfrenda({
      name, birth_year, death_year, relationship, story, narrative, voice_url,
      historical_context,
      temporal_workflow_id,
      status: 'complete',
    });

    // Store in Tiger Data (Postgres + pgvector for semantic search)
    const postgresId = await insertTribute({
      name, birth_year, death_year, relationship, story, narrative,
      voice_url, mongo_id: mongoId, embedding,
    });

    console.log(`💾 Stored ofrenda: mongo=${mongoId} pg=${postgresId}`);
    return { postgres_id: postgresId, mongo_id: mongoId };
  },
});

export const memorySearchTool = createTool({
  id: 'search_memories',
  description: 'Semantic search across all stored tributes using pgvector in Tiger Data',
  inputSchema: z.object({
    query_embedding: z.array(z.number()),
    limit: z.number().optional().default(5),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      name: z.string(),
      narrative: z.string().optional(),
      similarity: z.number(),
    })),
  }),
  execute: async ({ context }) => {
    const results = await semanticSearch(context.query_embedding, context.limit ?? 5);
    return {
      results: results.map((r: any) => ({
        id: r.id,
        name: r.name,
        narrative: r.narrative,
        similarity: parseFloat(r.similarity),
      })),
    };
  },
});
