import mongoose from 'mongoose';
import { config } from './config.js';
import { syncAllIndexes } from './utils/dbManager.js';

export async function connectDB() {
  const uri = config.mongoUri;
  const dbName = config.mongoDb;

  await mongoose.connect(uri, { dbName });
  console.log(`[DB] connected: ${uri} (dbName=${dbName})`);
  await syncAllIndexes();
}
