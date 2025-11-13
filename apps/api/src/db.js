import mongoose from 'mongoose';
import { config } from './config.js';
import { syncAllIndexes, normalizeMongoError } from './utils/dbManager.js';

export async function connectDB() {
  const uri = config.mongoUri;
  const dbName = config.mongoDb;

  try {
    await mongoose.connect(uri, { dbName });
    console.log(`[DB] connected: ${uri} (dbName=${dbName})`);
    await syncAllIndexes();
  } catch (error) {
    console.error(
      '[DB] Unable to connect to MongoDB. Ensure the local database service is running and that the MONGO_URI environment variable points to it.',
      error
    );
    throw error;
  }
}
