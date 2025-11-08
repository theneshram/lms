import mongoose from 'mongoose';
import { config } from '../config.js';

let currentConfig = {
  uri: config.mongoUri,
  dbName: config.mongoDb,
};

export function getCurrentDatabaseConfig() {
  return { ...currentConfig };
}

export async function reconnectDatabase({ uri, dbName }) {
  if (!uri) throw new Error('Database URI is required');
  await mongoose.disconnect();
  await mongoose.connect(uri, { dbName });
  currentConfig = { uri, dbName };
  await syncAllIndexes();
  console.log(`[DB] reconnected to ${uri} (dbName=${dbName})`);
  return currentConfig;
}

export async function syncAllIndexes() {
  const modelEntries = Object.values(mongoose.models);
  await Promise.all(modelEntries.map((model) => model.syncIndexes()))
    .catch((err) => console.error('[DB] sync indexes failed', err));
}

export default {
  getCurrentDatabaseConfig,
  reconnectDatabase,
  syncAllIndexes,
};
