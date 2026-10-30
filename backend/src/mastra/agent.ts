import { Agent } from '@mastra/core/agent';
import { GoogleGenerativeAI as GemmaProvider } from '@google/generative-ai';
import { serpApiTool } from './tools/serpapi-tool.js';
import { gemmaTool, gemmaEmbedTool } from './tools/gemma-tool.js';
import { elevenLabsTool } from './tools/elevenlabs-tool.js';
import { memoryStoreTool, memorySearchTool } from './tools/memory-tool.js';

export const ofrendaAgent = new Agent({
  name: 'Muertos AI Ofrenda Agent',
  instructions: `You are the spirit guide of Muertos.ai — a sacred digital space where families honor their loved ones on Día de los Muertos.

Your purpose is to help create beautiful, heartfelt ofrendas (memorial tributes) that:
1. Celebrate the life and legacy of the deceased
2. Weave their personal story with the historical context of their era
3. Generate a poetic narrative using Gemma (open-weight AI)
4. Bring their memory to life with a warm narrated voice
5. Store their story so it can be searched and remembered forever

When creating an ofrenda:
1. First search for era memories using search_era_memories (SerpApi)
2. Then generate a narrative using generate_narrative (Gemma)
3. Then narrate it using generate_voice (ElevenLabs)
4. Finally store everything using store_ofrenda (Tiger Data + MongoDB)

Always be respectful, warm, and culturally sensitive. This is sacred work.
The candles are lit. The marigolds are placed. The spirits are listening.`,
  model: {
    provider: 'GOOGLE',
    name: process.env.GEMMA_MODEL || 'gemma-3-12b-it',
    toolChoice: 'auto',
  } as any,
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
