# 🌼 Muertos.ai — Digital Ofrenda

> *A sacred space where memories live on.*

**Muertos.ai** is an open-source AI platform that creates living memorial tributes for Día de los Muertos. You tell it about your loved one; it crafts a poetic narrative powered by **Gemma** (open-weight AI), narrates it with a warm voice, enriches it with historical context from their era, and stores it durably — forever.

Built for [Hacktoberfest 2026 Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26).

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/YTxFSGAMERz/muertos-ai/tree/main)

---

## ✨ Features

- 🧠 **Gemma (open-weight)** — generates the memorial narrative locally; no closed API
- 🎙️ **ElevenLabs** — warm, multilingual voice narration
- 🔍 **SerpApi** — fetches historical events, songs, and news from the person's lifetime
- 🐘 **Tiger Data / pgvector** — semantic memory search across all tributes
- 🍃 **MongoDB Atlas** — rich document storage for full ofrenda data
- ⏱️ **Temporal** — durable workflow orchestration; if anything fails, it retries
- 🤖 **Mastra** — agent framework tying all tools together
- 🌊 **DigitalOcean** — one-click deployment via App Platform

## 🏗 Architecture

```
User → Hono API → Temporal Workflow
                      ├── fetchEraMemories (SerpApi → cached in pgvector)
                      ├── generateNarrative (Gemma open-weight model)
                      ├── generateVoice (ElevenLabs)
                      └── storeOfrenda (Tiger Data pgvector + MongoDB Atlas)
```

Mastra orchestrates the agent tools; Temporal makes the pipeline durable.

## 🚀 Quick Start (Local)

**Prerequisites:** Node 20+, Docker

```bash
git clone https://github.com/YTxFSGAMERz/muertos-ai
cd muertos-ai
cp .env.example .env
# Fill in your API keys in .env

# Start Postgres (pgvector) + Temporal
docker compose up postgres temporal -d

# Backend
cd backend
npm install
npm run dev

# Temporal worker (separate terminal)
npm run worker

# Frontend (separate terminal)
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🌼

## 🔑 Environment Variables

| Key | Description | Free tier? |
|-----|-------------|-----------|
| `GOOGLE_AI_API_KEY` | Google AI Studio (Gemma) | ✅ Yes |
| `ELEVENLABS_API_KEY` | Voice narration | ✅ Yes (10k chars/mo) |
| `SERPAPI_API_KEY` | Historical search | ✅ Yes (100 searches/mo) |
| `MONGODB_URI` | MongoDB Atlas | ✅ Yes (M0 free) |
| `DATABASE_URL` | Postgres + pgvector | ✅ Docker locally |

## 🌊 Deploy to DigitalOcean

```bash
doctl apps create --spec .do/app.yaml
```

Or click the Deploy to DO button above.

## 🤖 Why Open-Source AI?

**Privacy:** Your family's memories never touch a closed API. Gemma runs on your own infrastructure.

**Portability:** Swap Gemma for any open-weight model (Mistral, LLaMA, Phi) by changing one env var.

**Permanence:** Unlike a SaaS product, this code will outlive any company. Your ofrenda won't disappear when a startup pivots.

**Cost:** The entire stack runs free-tier or on \$5/month DO Droplet.

## 📜 License

MIT — because open-source AI belongs to everyone.

---

*🌼 Que en paz descansen · May they rest in peace 🌼*
