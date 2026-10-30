import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities/index.js';
import { initPostgres } from '../db/postgres.js';
import { initMongo } from '../db/mongo.js';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

// __dirname works in CJS (compiled output); for tsx watch use process.cwd()
const workflowsPath = join(
  typeof __dirname !== 'undefined' ? __dirname : process.cwd() + '/src/temporal',
  'workflows',
  'ofrenda-workflow.js'
);

async function main() {
  await initPostgres().catch(err => {
    console.warn('⚠️  Postgres not available (run docker-compose up):', err.message);
  });
  await initMongo().catch(err => {
    console.warn('⚠️  MongoDB not available:', err.message);
  });

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    workflowsPath,
    activities,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ofrenda-queue',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  });

  console.log('👻 Muertos.ai Temporal worker started');
  console.log(`   Task queue : ${process.env.TEMPORAL_TASK_QUEUE || 'ofrenda-queue'}`);
  console.log(`   Temporal   : ${process.env.TEMPORAL_ADDRESS || 'localhost:7233'}`);

  await worker.run();
}

main().catch(err => {
  console.error('Worker failed:', err);
  process.exit(1);
});
