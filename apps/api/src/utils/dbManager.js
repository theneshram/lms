import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
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
  await Promise.all(modelEntries.map((model) => model.syncIndexes())).catch((err) =>
    console.error('[DB] sync indexes failed', err)
  );
}

export async function testDatabaseConnection({ uri, dbName }) {
  if (!uri) throw new Error('Database URI is required');
  const connection = mongoose.createConnection(uri, {
    dbName,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  try {
    await connection.asPromise();
    const pingStart = performance.now();
    await connection.db.command({ ping: 1 });
    const pingMs = Number((performance.now() - pingStart).toFixed(2));
    return { pingMs };
  } catch (error) {
    throw normalizeMongoError(error);
  } finally {
    await connection.close().catch(() => {});
  }
}

export async function reconnectDatabase({ uri, dbName }) {
  try {
    await testDatabaseConnection({ uri, dbName });
  } catch (error) {
    throw error;
  }

  const previous = { ...currentConfig };
  try {
    await mongoose.disconnect();
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    currentConfig = { uri, dbName };
    await syncAllIndexes();
    console.log(`[DB] reconnected to ${uri} (dbName=${dbName})`);
    return await getDatabaseDiagnostics();
  } catch (error) {
    console.error('[DB] reconnection attempt failed', error);
    // Attempt to restore previous connection when possible
    if (previous?.uri && (previous.uri !== uri || previous.dbName !== dbName)) {
      try {
        await mongoose.connect(previous.uri, {
          dbName: previous.dbName,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        });
        currentConfig = { ...previous };
        console.log('[DB] reverted to previous database configuration');
      } catch (restoreError) {
        console.error('[DB] failed to restore previous database connection', restoreError);
      }
    }
    throw normalizeMongoError(error);
  }
}

export async function getDatabaseDiagnostics() {
  const diagnostics = {
    ...getCurrentDatabaseConfig(),
    connected: false,
    status: 'disconnected',
    readyState: mongoose.connection.readyState,
    lastCheckedAt: new Date().toISOString(),
  };

  if (mongoose.connection.readyState !== 1) {
    diagnostics.message = 'Database connection is not established.';
    return diagnostics;
  }

  diagnostics.connected = true;
  diagnostics.status = 'connected';
  diagnostics.host = mongoose.connection.host;
  diagnostics.port = mongoose.connection.port;
  diagnostics.user = mongoose.connection.user;

  try {
    const pingStart = performance.now();
    await mongoose.connection.db.command({ ping: 1 });
    diagnostics.pingMs = Number((performance.now() - pingStart).toFixed(2));
  } catch (error) {
    diagnostics.pingError = normalizeMongoError(error)?.message;
  }

  try {
    const stats = await mongoose.connection.db.command({ dbStats: 1, scale: 1024 * 1024 });
    diagnostics.stats = {
      collections: stats.collections,
      objects: stats.objects,
      storageSizeMb: Number((stats.storageSize || 0).toFixed(2)),
      dataSizeMb: Number((stats.dataSize || 0).toFixed(2)),
      indexSizeMb: Number((stats.indexSize || 0).toFixed(2)),
      avgObjSizeKb: stats.avgObjSize ? Number((stats.avgObjSize / 1024).toFixed(2)) : null,
    };
  } catch (error) {
    diagnostics.statsError = normalizeMongoError(error)?.message;
  }

  try {
    const serverStatus = await mongoose.connection.db.admin().command({ serverStatus: 1 });
    diagnostics.uptimeSeconds = serverStatus.uptime;
    diagnostics.connections = serverStatus.connections;
    diagnostics.memory = serverStatus.mem
      ? {
          residentMb: serverStatus.mem.resident,
          virtualMb: serverStatus.mem.virtual,
          mappedMb: serverStatus.mem.mapped,
        }
      : undefined;
    diagnostics.operationCounters = serverStatus.opcounters;
    diagnostics.network = serverStatus.network
      ? {
          bytesIn: serverStatus.network.bytesIn,
          bytesOut: serverStatus.network.bytesOut,
          numRequests: serverStatus.network.numRequests,
        }
      : undefined;
  } catch (error) {
    diagnostics.serverStatusError = normalizeMongoError(error)?.message;
  }

  return diagnostics;
}

export default {
  getCurrentDatabaseConfig,
  reconnectDatabase,
  syncAllIndexes,
  getDatabaseDiagnostics,
  testDatabaseConnection,
};
