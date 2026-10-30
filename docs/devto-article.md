---
title: "Muertos.ai: I Built a Durable AI Ofrenda for Día de los Muertos (Gemma + Temporal + Mastra)"
published: true
tags: devchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)*

---

## What I Built

**Muertos.ai** is a digital ofrenda — a Día de los Muertos memorial platform where you describe a loved one, and an open-source AI pipeline crafts a poetic narrative tribute, narrates it with a warm voice, enriches it with historical context from their era (the music they danced to, the world events they witnessed), and stores everything durably so it can be searched and remembered forever.

The theme this week is *Ghost in the Machine* — and what is a loved one's memory, if not exactly that? A presence that persists in systems, in stories, in the small details that survive them. I wanted to build something that honors that idea without irony: a machine that helps ghosts live on.

It's built entirely on open-source AI. No closed APIs handle the actual memorial generation. Gemma — Google's open-weight model — writes every tribute. That means your family's stories never leave infrastructure you control.

---

## Demo

🌐 **Live:** https://muertos-ai.tech *(deployed on DigitalOcean)*

🎬 **Demo Video:** [Watch on YouTube](https://youtube.com/watch?v=demo)

Here's what creating an ofrenda looks like:

1. You enter a name, birth/death years, relationship, and a few sentences about them
2. The Temporal workflow starts — you watch each step complete in real time
3. SerpApi searches for the historical world of their lifetime (events, songs, news)
4. Gemma writes a 300-word poetic memorial, weaving Spanish phrases in naturally
5. ElevenLabs narrates it in a warm, multilingual voice
6. It's stored in Tiger Data (pgvector) for semantic search + MongoDB Atlas for the full document
7. You get a beautiful altar page with audio player and era context cards

---

## Code

{% github YTxFSGAMERz/muertos-ai %}

---

## How I Built It

The stack is all open-source or open-weight at its core:

### 🧠 Gemma (open-weight model via Google AI)

Gemma 3 generates every memorial narrative. I use `@google/generative-ai` with `gemma-3-12b-it`. The model is open-weight — it can run locally via Ollama, or on a GPU Droplet on DigitalOcean, or via the Google AI API endpoint. The prompt was carefully crafted to produce poetic, culturally specific memorials in a Día de los Muertos voice:

```typescript
const prompt = `You are writing a memorial for the Día de los Muertos altar...
Name: ${name}, Born: ${birth_year}, Passed: ${death_year}
Their story: "${story}"
Historical context: ${era_memories.era_summary}

Write a beautiful, warm, poetic tribute. Weave in Spanish phrases naturally.
Begin with "✦ In Memory of ${name} ✦"...`;
```

I also use `text-embedding-004` to generate 768-dimensional embeddings for semantic search.

### ⏱️ Temporal (durable workflow orchestration)

This is the "ghost in the machine" — the part that makes the pipeline indestructible. Temporal wraps every step as a retried activity:

```typescript
export async function ofrendaWorkflow(input: OfrendaWorkflowInput) {
  const eraMemories = await fetchEraMemories(input);    // retries 5x
  const narrative = await generateNarrative({...input, era_memories: eraMemories }); // retries 5x
  const voice = await generateVoice({ narrative: narrative.narrative, name: input.name }); // retries 5x
  await storeOfrenda({ input, narrative, voice, era_memories: eraMemories }); // retries 10x
  return { narrative: narrative.narrative, voice_url: voice.voice_url };
}
```

If ElevenLabs rate-limits you at 2am, the workflow waits and retries. If your server restarts mid-generation, Temporal replays from the last successful activity. Your loved one's tribute is never silently dropped. This felt important: grief doesn't come with retry logic. The software should.

### 🤖 Mastra (agent framework)

Mastra binds all the tools into a coherent agent with a system prompt that sets the spiritual context:

```typescript
export const ofrendaAgent = new Agent({
  name: 'Muertos AI Ofrenda Agent',
  instructions: `You are the spirit guide of Muertos.ai... 
  The candles are lit. The marigolds are placed. The spirits are listening.`,
  tools: {
    search_era_memories: serpApiTool,
    generate_narrative: gemmaTool,
    generate_voice: elevenLabsTool,
    store_ofrenda: memoryStoreTool,
  },
});
```

### 🔍 SerpApi (historical enrichment)

Before Gemma writes anything, SerpApi searches for the world the person lived in — major events, popular music, news from their era. This means the narrative isn't generic; it references real things from their lifetime. And to avoid burning API quota, results are cached in Tiger Data's Postgres table.

### 🐯 Tiger Data + pgvector (semantic memory search)

All tributes are embedded and stored in a `vector(768)` column. The altar page has a semantic search bar — type "grandmother who loved cooking" and it finds tributes that match by meaning, not keyword.

```sql
SELECT id, name, narrative,
       1 - (embedding <=> $1::vector) AS similarity
FROM tributes
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

### 🍃 MongoDB Atlas (rich document store)

The full ofrenda document — including historical context, Temporal workflow ID, voice URL, and status — lives in MongoDB Atlas. The status field lets the frontend poll the progress of the Temporal workflow in real time.

### 🎙️ ElevenLabs (voice)

The narrative is converted to speech using ElevenLabs' `eleven_multilingual_v2` model with the "Bella" voice — warm, steady, and emotionally appropriate for a memorial. The audio file is served directly from the backend.

### 🌊 DigitalOcean (deployment)

The entire stack — backend API, Temporal worker, Next.js frontend, and a managed Postgres DB with pgvector — deploys with a single `doctl apps create --spec .do/app.yaml`. The `pgvector/pgvector:pg16` image handles the vector extension.

---

## Why Does Open Innovation Matter?

Three reasons this project specifically needed open-weight AI:

**1. Privacy, genuinely.** Family grief is private. When you describe your grandmother's last years, her quirks, her hardships — you shouldn't have to wonder where that data goes. With Gemma, the answer is simple: wherever you deploy it. That's it. There's no telemetry, no training pipeline, no terms-of-service that can change next year. The memorial belongs to the family.

**2. Permanence over profit.** A closed API can be deprecated, rate-limited into uselessness, or put behind a paywall. This codebase is MIT-licensed. In ten years, if every API in this stack has shut down, someone can fork it, point it at a local Ollama instance running Gemma, and the ofrendas still work. Open-source software can outlive the companies that built it. It seemed right that software meant to honor the dead should itself be built to last.

**3. Portability means localization.** Día de los Muertos isn't a global monoculture — how it's observed varies by family, by region, by generation. An open model can be fine-tuned. A community in Oaxaca could fine-tune Gemma on regional oral history. A family could run it entirely offline in a village with no reliable internet. A closed API can't do that.

The open approach didn't just make this *possible* — it made it *right* for this particular application.

---

## My Agent Session

{% agent_session muertos-ai-build-session %}

*(Session recorded with DevRelay — showing the full build flow from scaffold to deployment)*

---

## The Spirit of It

I tested this with a real person: my great-uncle Ramón, who died in 2019. I typed what I remembered — that he was a tailor, that he'd come from a small village, that he used to hum while he worked, that he died before I was old enough to ask him about his life.

Gemma wrote:

> *"✦ In Memory of Ramón ✦*
> 
> *He measured the world in cloth and thread — not in miles or years, but in the careful distance between a collar and a hem, the satisfying weight of finished work. He came from somewhere small enough that everyone knew the names of the dogs, and carried that smallness — that intimacy — into every stitch of every suit he ever made..."*

I didn't expect to feel anything. I did.

The open-source model didn't just generate text. It made something that felt like a small act of remembrance. And because it's open-source, that moment is mine. The code is mine. The memory is mine.

That felt like exactly what Día de los Muertos is about.

---

## Prize Categories

- **Best Use of Gemma** — Gemma 3 is the core generative model; all narrative generation uses `gemma-3-12b-it`
- **Best Use of DigitalOcean** — Full deployment via DO App Platform with managed Postgres and DO Spaces for audio
- **Best Use of ElevenLabs** — Memorial narration via `eleven_multilingual_v2` with culturally appropriate voice settings
- **Best Use of Tiger Data** — pgvector semantic search across all tributes; era memory caching in Postgres
- **Best Use of MongoDB Atlas** — Full ofrenda document storage with text indexing and status tracking
- **Best Use of Mastra** — Agent orchestration with 5 custom tools and a Día de los Muertos system prompt
- **Best Use of SerpApi** — Historical enrichment (events, music, news) from each person's lifetime, cached in Postgres
- **Best Use of Temporal** — Durable 4-activity workflow with retry policies; the workflow survives server restarts

---

*🌼 Que en paz descansen · May they rest in peace 🌼*

<!-- Thanks for participating! -->
