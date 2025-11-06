import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};