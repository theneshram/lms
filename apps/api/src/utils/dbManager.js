import mongoose from 'mongoose';
import { config } from '../config.js';

let currentConfig = {
  uri: config.mongoUri,
  dbName: config.mongoDb,
};

export function getCurrentDatabaseConfig() {
  return { ...currentConfig };
}

export async function reconnectDatabase({ uri, dbName } = {}) {
  const requestedUri = uri ?? currentConfig.uri;
  const requestedDbName = dbName ?? currentConfig.dbName;

  if (requestedUri !== currentConfig.uri || requestedDbName !== currentConfig.dbName) {
    const error = new Error(
      'Dynamic database switching is disabled. Update the environment variables to change the MongoDB connection.'
    );
    error.code = 'DB_SWITCH_DISABLED';
    throw error;
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(currentConfig.uri, { dbName: currentConfig.dbName });
    await syncAllIndexes();
    console.log('[DB] ensured local MongoDB connection is active');
  }

  return getCurrentDatabaseConfig();
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
