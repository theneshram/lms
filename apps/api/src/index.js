import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './db.js';
import { config } from './config.js';

import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import quizRoutes from './routes/quizzes.js';
import submissionRoutes from './routes/submissions.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req,res)=>res.json({ ok:true, ts: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);   

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

connectDB().then(()=>{
  app.listen(config.port, () => console.log(`🚀 API running on port ${config.port}`));
});