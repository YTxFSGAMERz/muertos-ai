import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getJson } from 'serpapi';
import { cacheEraMemories, getCachedEraMemories } from '../../db/postgres.js';

export const serpApiTool = createTool({
  id: 'search_era_memories',
  description: 'Search for historical events, songs, and news from a person\'s lifetime using SerpApi',
  inputSchema: z.object({
    name: z.string().describe('Name of the deceased person'),
    birth_year: z.number().optional().describe('Year they were born'),
    death_year: z.number().optional().describe('Year they passed away'),
  }),
  outputSchema: z.object({
    events: z.array(z.string()),
    songs: z.array(z.string()),
    news: z.array(z.string()),
    era_summary: z.string(),
  }),
  execute: async ({ context }) => {
    const { name, birth_year, death_year } = context;
    const yearRange = `${birth_year ?? 'unknown'}-${death_year ?? 'unknown'}`;

    // Check cache first (Tiger Data / pgvector postgres)
    const cached = await getCachedEraMemories(yearRange).catch(() => null);
    if (cached) {
      console.log(`🎃 Using cached era memories for ${yearRange}`);
      return {
        events: cached.events ?? [],
        songs: cached.songs ?? [],
        news: cached.news ?? [],
        era_summary: `Life spanning ${yearRange}`,
      };
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.warn('No SERPAPI_API_KEY — using placeholder era memories');
      return getMockEraMemories(birth_year, death_year);
    }

    try {
      const midYear = birth_year && death_year ? Math.floor((birth_year + death_year) / 2) : birth_year ?? 1960;

      // Search for historical events
      const eventsRes = await getJson({
        engine: 'google',
        q: `major world events ${birth_year} to ${death_year}`,
        api_key: apiKey,
        num: 5,
      });

      // Search for popular music of the era
      const songsRes = await getJson({
        engine: 'google',
        q: `most popular songs ${midYear} music hits`,
        api_key: apiKey,
        num: 5,
      });

      const events: string[] = (eventsRes.organic_results ?? [])
        .slice(0, 5)
        .map((r: any) => r.snippet ?? r.title)
        .filter(Boolean);

      const songs: string[] = (songsRes.organic_results ?? [])
        .slice(0, 5)
        .map((r: any) => r.title)
        .filter(Boolean);

      const result = {
        events,
        songs,
        news: events.slice(0, 3),
        era_summary: `They lived through an era that spanned ${yearRange}, witnessing ${events[0] ?? 'great historical change'}.`,
      };

      // Cache in Tiger Data postgres
      await cacheEraMemories(yearRange, result).catch(console.error);

      return result;
    } catch (err) {
      console.error('SerpApi error:', err);
      return getMockEraMemories(birth_year, death_year);
    }
  },
});

function getMockEraMemories(birthYear?: number, deathYear?: number) {
  const by = birthYear ?? 1940;
  const dy = deathYear ?? 2020;
  return {
    events: [
      `The world changed dramatically between ${by} and ${dy}`,
      'Humanity witnessed unprecedented technological advancement',
      'Communities came together through times of triumph and hardship',
    ],
    songs: [
      'La Llorona — timeless folk ballad',
      'Cielito Lindo — beloved traditional song',
      'Bésame Mucho — eternal love song',
    ],
    news: [
      'A generation that bridged the old world and the new',
      'Witnesses to history in the making',
    ],
    era_summary: `A life lived fully across ${by}–${dy}, spanning decades of profound change.`,
  };
}
