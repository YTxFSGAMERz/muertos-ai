/**
 * Temporal Activities for Muertos.ai
 * Each activity wraps a tool/service call and is retried automatically by Temporal.
 * This means: if SerpApi is down, if ElevenLabs throttles, if MongoDB has a hiccup —
 * the workflow continues from where it left off. Your tribute is never lost.
 */
import { activityInfo, heartbeat } from '@temporalio/activity';
import { getJson } from 'serpapi';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { ElevenLabsClient } from 'elevenlabs';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { cacheEraMemories, getCachedEraMemories, insertTribute, semanticSearch } from '../../db/postgres';
import { createOfrenda, updateOfrenda } from '../../db/mongo';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export interface OfrendaInput {
  name: string;
  birth_year?: number;
  death_year?: number;
  relationship?: string;
  story?: string;
  mongo_id: string; // Pre-created MongoDB doc ID for status tracking
}

export interface EraMemories {
  events: string[];
  songs: string[];
  news: string[];
  era_summary: string;
}

export interface NarrativeResult {
  narrative: string;
  title: string;
  embedding: number[];
}

export interface VoiceResult {
  voice_url: string;
  duration_estimate: string;
}

export interface StoreResult {
  postgres_id: string;
  mongo_id: string;
}

// ─── Activity 1: Fetch era memories via SerpApi ───────────────────────────────
export async function fetchEraMemories(input: OfrendaInput): Promise<EraMemories> {
  heartbeat('Fetching era memories via SerpApi...');
  const { birth_year, death_year } = input;
  const yearRange = `${birth_year ?? 'unknown'}-${death_year ?? 'unknown'}`;

  const cached = await getCachedEraMemories(yearRange).catch(() => null);
  if (cached) return { events: cached.events, songs: cached.songs, news: cached.news, era_summary: `Life spanning ${yearRange}` };

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return getPlaceholderEra(birth_year, death_year);

  try {
    const midYear = birth_year && death_year ? Math.floor((birth_year + death_year) / 2) : birth_year ?? 1960;
    const [eventsRes, songsRes] = await Promise.all([
      getJson({ engine: 'google', q: `major world events ${birth_year} to ${death_year} history`, api_key: apiKey, num: 5 }),
      getJson({ engine: 'google', q: `most popular songs ${midYear} music era`, api_key: apiKey, num: 5 }),
    ]);

    const events: string[] = (eventsRes.organic_results ?? []).slice(0, 5).map((r: any) => r.snippet ?? r.title).filter(Boolean);
    const songs: string[] = (songsRes.organic_results ?? []).slice(0, 5).map((r: any) => r.title).filter(Boolean);
    const result = { events, songs, news: events.slice(0, 3), era_summary: `Era spanning ${yearRange}` };

    await cacheEraMemories(yearRange, result).catch(console.error);
    return result;
  } catch (err) {
    console.error('SerpApi activity error:', err);
    return getPlaceholderEra(birth_year, death_year);
  }
}

// ─── Activity 2: Generate narrative via Gemma (open-weight) ──────────────────
export async function generateNarrative(input: OfrendaInput & { era_memories: EraMemories }): Promise<NarrativeResult> {
  heartbeat('Generating memorial narrative with Gemma...');
  const { name, birth_year, death_year, relationship, story, era_memories, mongo_id } = input;

  // Update MongoDB status
  await updateOfrenda(mongo_id, { status: 'processing' }).catch(console.error);

  const model = genAI.getGenerativeModel({ model: process.env.GEMMA_MODEL || 'gemma-3-12b-it' });
  const eraCtx = `Events: ${era_memories.events.slice(0, 3).join('; ')}\nMusic: ${era_memories.songs.slice(0, 3).join(', ')}\n${era_memories.era_summary}`;

  const prompt = `You are writing a memorial for the Día de los Muertos (Day of the Dead) altar — a celebration of life, love, and memory.

Name: ${name}
${birth_year ? `Born: ${birth_year}` : ''}
${death_year ? `Passed: ${death_year}` : ''}
${relationship ? `Relationship: ${relationship}` : ''}
${story ? `Family's words: "${story}"` : ''}

Historical context from their lifetime:
${eraCtx}

Write a beautiful, poetic memorial tribute (250-400 words). Start with "✦ In Memory of ${name} ✦". Weave in Spanish phrases naturally. Reference their era. End with a blessing. Write only the memorial text.`;

  const result = await model.generateContent(prompt);
  const narrative = result.response.text().trim();

  // Generate embedding for Tiger Data (pgvector semantic search)
  heartbeat('Generating semantic embedding...');
  const embModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const embResult = await embModel.embedContent({
    content: { parts: [{ text: `${name} ${story ?? ''} ${narrative.slice(0, 500)}` }], role: 'user' },
    taskType: TaskType.SEMANTIC_SIMILARITY,
  });

  return { narrative, title: `In Memory of ${name}`, embedding: embResult.embedding.values };
}

// ─── Activity 3: Generate voice via ElevenLabs ───────────────────────────────
export async function generateVoice(params: { narrative: string; name: string; mongo_id: string }): Promise<VoiceResult> {
  heartbeat('Generating voice narration with ElevenLabs...');
  const { narrative, name, mongo_id } = params;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) return { voice_url: '', duration_estimate: '~2m' };

  const client = new ElevenLabsClient({ apiKey });
  const text = narrative.length > 2000 ? narrative.slice(0, 2000) + '...' : narrative;

  const audio = await client.textToSpeech.convert(
    process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.75, similarity_boost: 0.85, style: 0.4 } }
  );

  const audioDir = join(process.cwd(), 'public', 'audio');
  mkdirSync(audioDir, { recursive: true });
  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${safeName}_${mongo_id.slice(0, 8)}.mp3`;
  const filePath = join(audioDir, filename);

  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(filePath);
    if (audio instanceof Readable) { audio.pipe(ws); audio.on('end', resolve); audio.on('error', reject); }
    else { ws.write(audio); ws.end(); ws.on('finish', resolve); ws.on('error', reject); }
  });

  const wc = text.split(' ').length;
  const secs = Math.ceil(wc / 2.5);
  return { voice_url: `/audio/${filename}`, duration_estimate: `~${Math.floor(secs / 60)}m${secs % 60}s` };
}

// ─── Activity 4: Store in Tiger Data + MongoDB ───────────────────────────────
export async function storeOfrenda(params: {
  input: OfrendaInput;
  narrative: NarrativeResult;
  voice: VoiceResult;
  era_memories: EraMemories;
}): Promise<StoreResult> {
  heartbeat('Storing ofrenda in Tiger Data + MongoDB Atlas...');
  const { input, narrative, voice, era_memories } = params;

  // Update MongoDB with full data
  await updateOfrenda(input.mongo_id, {
    narrative: narrative.narrative,
    voice_url: voice.voice_url,
    historical_context: era_memories,
    status: 'complete',
  });

  // Store in Tiger Data (Postgres + pgvector)
  const postgresId = await insertTribute({
    name: input.name,
    birth_year: input.birth_year,
    death_year: input.death_year,
    relationship: input.relationship,
    story: input.story,
    narrative: narrative.narrative,
    voice_url: voice.voice_url,
    mongo_id: input.mongo_id,
    embedding: narrative.embedding,
  });

  return { postgres_id: postgresId, mongo_id: input.mongo_id };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPlaceholderEra(birthYear?: number, deathYear?: number): EraMemories {
  const by = birthYear ?? 1940;
  const dy = deathYear ?? 2020;
  return {
    events: [`The world between ${by} and ${dy} witnessed tremendous change`, 'Communities grew stronger through shared hardship', 'Technology transformed daily life'],
    songs: ['La Llorona', 'Cielito Lindo', 'Bésame Mucho'],
    news: ['A generation that bridged worlds', 'Witnesses to history'],
    era_summary: `A life lived across ${by}–${dy}, spanning decades of profound change.`,
  };
}
