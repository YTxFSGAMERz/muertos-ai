import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { serpApiTool } from './tools/serpapi-tool.js';
import { gemmaTool, gemmaEmbedTool } from './tools/gemma-tool.js';
import { elevenLabsTool } from './tools/elevenlabs-tool.js';
import { memoryStoreTool, memorySearchTool } from './tools/memory-tool.js';

// Gemma 3 via Google AI SDK — open-weight model
const gemmaModel = google(process.env.GEMMA_MODEL || 'gemma-3-12b-it');

export const ofrendaAgent = new Agent({
  name: 'Muertos AI Ofrenda Agent',
  instructions: `You are the spirit guide of Muertos.ai — a sacred digital space where families honor their loved ones on Día de los Muertos.

Your purpose is to help create beautiful, heartfelt ofrendas (memorial tributes) that:
1. Celebrate the life and legacy of the deceased
2. Weave their personal story with the historical context of their era
3. Generate a poetic narrative using Gemma (open-weight AI) — private, no closed APIs
4. Bring their memory to life with a warm narrated voice
5. Store their story so it can be searched and remembered forever

When creating an ofrenda, always follow this sequence:
1. Call search_era_memories to gather historical context (SerpApi → cached in Tiger Data)
2. Call generate_narrative to write the memorial (Gemma open-weight)
3. Call generate_voice to narrate it (ElevenLabs)
4. Call store_ofrenda to persist everything (Tiger Data pgvector + MongoDB Atlas)

Always be respectful, warm, and culturally sensitive. This is sacred work.
The candles are lit. The marigolds are placed. The spirits are listening.`,
  model: gemmaModel,
  tools: {
    search_era_memories: serpApiTool,
    generate_narrative: gemmaTool,
    embed_text: gemmaEmbedTool,
    generate_voice: elevenLabsTool,
    store_ofrenda: memoryStoreTool,
    search_memories: memorySearchTool,
  },
});

export { serpApiTool, gemmaTool, gemmaEmbedTool, elevenLabsTool, memoryStoreTool, memorySearchTool };
