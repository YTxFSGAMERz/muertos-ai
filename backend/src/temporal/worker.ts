/**
 * Temporal Worker — registers workflows and activities
 * Run: npm run worker
 */
import { Worker } from '@temporalio/worker';
import * as activities from './activities/index.js';
import { initPostgres } from '../db/postgres.js';
import { initMongo } from '../db/mongo.js';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

async function main() {
  // Initialize databases before starting worker
  await initPostgres().catch(err => {
    console.warn('⚠️  Postgres not available (run docker-compose up):', err.message);
  });
  await initMongo().catch(err => {
    console.warn('⚠️  MongoDB not available:', err.message);
  });

  const worker = await Worker.create({
    workflowsPath: join(__dirname, 'workflows/ofrenda-workflow.js'),
    activities,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ofrenda-queue',
    connection: {
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    },
  });

  console.log('👻 Muertos.ai Temporal worker started');
  console.log(`   Task queue: ${process.env.TEMPORAL_TASK_QUEUE || 'ofrenda-queue'}`);
  console.log(`   Temporal:   ${process.env.TEMPORAL_ADDRESS || 'localhost:7233'}`);

  await worker.run();
}

main().catch(err => {
  console.error('Worker failed:', err);
  process.exit(1);
});
