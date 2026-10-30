import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ElevenLabsClient } from 'elevenlabs';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

// Voice ID — "Bella" voice, warm and gentle
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export const elevenLabsTool = createTool({
  id: 'generate_voice',
  description: 'Generate voice narration of the memorial using ElevenLabs TTS',
  inputSchema: z.object({
    narrative: z.string().describe('The memorial text to narrate'),
    name: z.string().describe('Name of the deceased for file naming'),
    tribute_id: z.string().optional(),
  }),
  outputSchema: z.object({
    voice_url: z.string(),
    voice_path: z.string(),
    duration_estimate: z.string(),
  }),
  execute: async ({ context }) => {
    const { narrative, name, tribute_id } = context;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.warn('No ELEVENLABS_API_KEY — skipping voice generation');
      return {
        voice_url: '',
        voice_path: '',
        duration_estimate: '~2 minutes',
      };
    }

    const client = new ElevenLabsClient({ apiKey });

    // Truncate narrative to ~2000 chars for ElevenLabs free tier limits
    const text = narrative.length > 2000 ? narrative.slice(0, 2000) + '...' : narrative;

    const audio = await client.textToSpeech.convert(DEFAULT_VOICE_ID, {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.85,
        style: 0.4,
        use_speaker_boost: true,
      },
    });

    // Save audio locally (in production, upload to DO Spaces / S3)
    const audioDir = join(process.cwd(), 'public', 'audio');
    mkdirSync(audioDir, { recursive: true });
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeName}_${tribute_id ?? Date.now()}.mp3`;
    const filePath = join(audioDir, filename);
    const voice_url = `/audio/${filename}`;

    // Stream audio to file
    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      if (audio instanceof Readable) {
        audio.pipe(writeStream);
        audio.on('end', resolve);
        audio.on('error', reject);
      } else {
        // Handle Buffer response
        writeStream.write(audio);
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      }
    });

    const wordCount = text.split(' ').length;
    const estimatedSeconds = Math.ceil(wordCount / 2.5); // ~150 wpm
    const mins = Math.floor(estimatedSeconds / 60);
    const secs = estimatedSeconds % 60;

    console.log(`🎙️ Voice generated: ${filename} (~${mins}m${secs}s)`);
    return {
      voice_url,
      voice_path: filePath,
      duration_estimate: `~${mins}m${secs}s`,
    };
  },
});
