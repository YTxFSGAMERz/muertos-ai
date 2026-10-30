import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Gemma 3 — open-weight model via Google AI
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma-3-12b-it';
// Text embedding model (open-weight compatible)
const EMBEDDING_MODEL = 'text-embedding-004';

export const gemmaTool = createTool({
  id: 'generate_narrative',
  description: 'Generate a beautiful poetic memorial narrative using Gemma (open-weight model)',
  inputSchema: z.object({
    name: z.string(),
    birth_year: z.number().optional(),
    death_year: z.number().optional(),
    relationship: z.string().optional(),
    story: z.string().optional(),
    era_memories: z.object({
      events: z.array(z.string()),
      songs: z.array(z.string()),
      news: z.array(z.string()),
      era_summary: z.string(),
    }).optional(),
  }),
  outputSchema: z.object({
    narrative: z.string(),
    title: z.string(),
    embedding: z.array(z.number()),
  }),
  execute: async ({ context }) => {
    const { name, birth_year, death_year, relationship, story, era_memories } = context;

    const model = genAI.getGenerativeModel({ model: GEMMA_MODEL });

    const eraContext = era_memories
      ? `\n\nHistorical context from their lifetime:\n- Events: ${era_memories.events.slice(0, 3).join('; ')}\n- Music of their era: ${era_memories.songs.slice(0, 3).join(', ')}\n- Era: ${era_memories.era_summary}`
      : '';

    const prompt = `You are writing a memorial for the Día de los Muertos (Day of the Dead) altar — a celebration of life, love, and memory. Write a beautiful, warm, and poetic tribute for the following person.

Name: ${name}
${birth_year ? `Born: ${birth_year}` : ''}
${death_year ? `Passed: ${death_year}` : ''}
${relationship ? `Relationship to the family: ${relationship}` : ''}
${story ? `Their story, in the family's own words:\n"${story}"` : ''}
${eraContext}

Guidelines:
- Write in English, but weave in Spanish phrases naturally (like "que en paz descanse", "te queremos", "tu luz sigue brillando")
- Begin with a title line: "✦ In Memory of [Name] ✦"
- Then 3–4 paragraphs, lyrical and warm, celebrating their life
- Reference their era if provided — the world they lived in, the music they might have danced to
- End with a closing blessing
- Avoid generic platitudes; make it feel specific to this person
- Length: 250–400 words

Write only the memorial text, nothing else.`;

    const result = await model.generateContent(prompt);
    const narrative = result.response.text().trim();
    const title = `In Memory of ${name}`;

    // Generate embedding for semantic search in Tiger Data (pgvector)
    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const embeddingResult = await embeddingModel.embedContent({
      content: { parts: [{ text: `${name} ${story ?? ''} ${narrative.slice(0, 500)}` }], role: 'user' },
      taskType: TaskType.SEMANTIC_SIMILARITY,
    });
    const embedding = embeddingResult.embedding.values;

    return { narrative, title, embedding };
  },
});

export const gemmaEmbedTool = createTool({
  id: 'embed_text',
  description: 'Generate text embeddings using Google text-embedding-004 for semantic search',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ embedding: z.array(z.number()) }),
  execute: async ({ context }) => {
    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await embeddingModel.embedContent({
      content: { parts: [{ text: context.text }], role: 'user' },
      taskType: TaskType.SEMANTIC_SIMILARITY,
    });
    return { embedding: result.embedding.values };
  },
});
