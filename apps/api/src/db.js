import mongoose from 'mongoose';
import { config } from './config.js';
import { syncAllIndexes, normalizeMongoError } from './utils/dbManager.js';

export async function connectDB() {
  const uri = config.mongoUri;
  const dbName = config.mongoDb;

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`[DB] connected: ${uri} (dbName=${dbName})`);
    await syncAllIndexes();
  } catch (error) {
    const normalized = normalizeMongoError?.(error) ?? error;
    console.error('[DB] Initial connection failed', normalized);
    throw normalized;
  }
}
