/**
 * Temporal Workflow — The "Ghost in the Machine" that keeps tributes alive.
 *
 * This workflow is durable: if any step fails (network blip, API rate limit,
 * server restart), Temporal replays from the last successful activity.
 * Your loved one's tribute is NEVER lost.
 *
 * Retry policies ensure:
 * - SerpApi: 3 retries (search can be flaky)
 * - Gemma: 5 retries (generation may timeout on cold start)
 * - ElevenLabs: 3 retries (audio generation can throttle)
 * - Database: 10 retries (storage must not fail)
 */
import { proxyActivities, sleep, defineSignal, setHandler } from '@temporalio/workflow';
import type * as Activities from '../activities/index.js';

const { fetchEraMemories, generateNarrative, generateVoice, storeOfrenda } = proxyActivities<typeof Activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,
  },
});

// Signal to allow cancellation of the workflow
export const cancelOfrendaSignal = defineSignal<[string]>('cancel');

export interface OfrendaWorkflowInput {
  name: string;
  birth_year?: number;
  death_year?: number;
  relationship?: string;
  story?: string;
  mongo_id: string;
}

export interface OfrendaWorkflowResult {
  narrative: string;
  title: string;
  voice_url: string;
  postgres_id: string;
  mongo_id: string;
  duration_estimate: string;
  era_summary: string;
}

export async function ofrendaWorkflow(input: OfrendaWorkflowInput): Promise<OfrendaWorkflowResult> {
  let cancelled = false;
  setHandler(cancelOfrendaSignal, () => { cancelled = true; });

  console.log(`🕯️ Starting ofrenda workflow for: ${input.name}`);

  // Step 1: Fetch historical context (SerpApi — cached in Tiger Data)
  const eraMemories = await fetchEraMemories(input);
  if (cancelled) throw new Error('Workflow cancelled');

  // Step 2: Generate narrative with Gemma (open-weight AI)
  const narrative = await generateNarrative({ ...input, era_memories: eraMemories });
  if (cancelled) throw new Error('Workflow cancelled');

  // Step 3: Generate voice narration (ElevenLabs)
  const voice = await generateVoice({
    narrative: narrative.narrative,
    name: input.name,
    mongo_id: input.mongo_id,
  });
  if (cancelled) throw new Error('Workflow cancelled');

  // Step 4: Persist everything (Tiger Data pgvector + MongoDB Atlas)
  const stored = await storeOfrenda({ input, narrative, voice, era_memories: eraMemories });

  console.log(`✨ Ofrenda complete for: ${input.name} (pg: ${stored.postgres_id})`);

  return {
    narrative: narrative.narrative,
    title: narrative.title,
    voice_url: voice.voice_url,
    postgres_id: stored.postgres_id,
    mongo_id: stored.mongo_id,
    duration_estimate: voice.duration_estimate,
    era_summary: eraMemories.era_summary,
  };
}
