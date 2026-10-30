import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient;
let db: Db;

export interface OfrendaDocument {
  _id?: ObjectId;
  name: string;
  birth_year?: number;
  death_year?: number;
  relationship?: string;
  story?: string;
  narrative?: string;
  voice_url?: string;
  postgres_id?: string;
  historical_context?: {
    events: string[];
    songs: string[];
    news: string[];
  };
  temporal_workflow_id?: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export async function initMongo(): Promise<void> {
  client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/muertos_ai');
  await client.connect();
  db = client.db('muertos_ai');

  // Create indexes
  const ofrendas = db.collection<OfrendaDocument>('ofrendas');
  await ofrendas.createIndex({ name: 'text', story: 'text', narrative: 'text' });
  await ofrendas.createIndex({ status: 1, created_at: -1 });
  await ofrendas.createIndex({ temporal_workflow_id: 1 }, { unique: true, sparse: true });

  console.log('✅ MongoDB Atlas connected');
}

export function getOfrendaCollection(): Collection<OfrendaDocument> {
  return db.collection<OfrendaDocument>('ofrendas');
}

export async function createOfrenda(data: Omit<OfrendaDocument, '_id' | 'created_at' | 'updated_at'>): Promise<string> {
  const col = getOfrendaCollection();
  const now = new Date();
  const result = await col.insertOne({
    ...data,
    created_at: now,
    updated_at: now,
  });
  return result.insertedId.toString();
}

export async function updateOfrenda(mongoId: string, updates: Partial<OfrendaDocument>): Promise<void> {
  const col = getOfrendaCollection();
  await col.updateOne(
    { _id: new ObjectId(mongoId) },
    { $set: { ...updates, updated_at: new Date() } }
  );
}

export async function getOfrenda(mongoId: string): Promise<OfrendaDocument | null> {
  const col = getOfrendaCollection();
  return col.findOne({ _id: new ObjectId(mongoId) });
}

export async function getAllOfrendas(limit = 20): Promise<OfrendaDocument[]> {
  const col = getOfrendaCollection();
  return col.find({ status: 'complete' }).sort({ created_at: -1 }).limit(limit).toArray();
}

export async function getOfrendaByWorkflowId(workflowId: string): Promise<OfrendaDocument | null> {
  const col = getOfrendaCollection();
  return col.findOne({ temporal_workflow_id: workflowId });
}

export async function closeMongo(): Promise<void> {
  if (client) await client.close();
}
