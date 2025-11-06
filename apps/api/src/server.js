import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';


process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION', err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
  process.exit(1);
});
console.log('ENV:', { PORT: process.env.PORT, CORS_ORIGIN: process.env.CORS_ORIGIN, MONGO_URI: !!process.env.MONGO_URI });

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ ok: true, mongo: process.env.MONGO_URI ? 'found' : 'missing' })
);

// Connect to Mongo (no pg anywhere)
await connectDB();

app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API running on port ${PORT}`));
