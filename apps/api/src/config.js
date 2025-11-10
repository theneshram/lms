import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: localEnvPath });
dotenv.config({ path: rootEnvPath, override: true });

export const config = {
  port: process.env.PORT || 8080,

  // Prefer explicit MONGO_URI; fall back to docker service or local dev
  mongoUri:
    process.env.MONGO_URI ||
    (process.env.IN_DOCKER ? 'mongodb://db:27017' : 'mongodb://127.0.0.1:27017'),

  // allow DB name override
  mongoDb: process.env.MONGO_DB || 'lms',

  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Super Admin',
  },

  storageRoot: process.env.STORAGE_ROOT || path.resolve(__dirname, '../../storage/uploads'),
};
