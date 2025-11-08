import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './db.js';
import { config } from './config.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import groupRoutes from './routes/groups.js';
import courseRoutes from './routes/courses.js';
import contentRoutes from './routes/content.js';
import enrollmentRoutes from './routes/enrollments.js';
import assignmentRoutes from './routes/assignments.js';
import quizRoutes from './routes/quizzes.js';
import submissionRoutes from './routes/submissions.js';
import certificationRoutes from './routes/certifications.js';
import discussionRoutes from './routes/discussions.js';
import messagingRoutes from './routes/messaging.js';
import virtualRoutes from './routes/virtual.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import gamificationRoutes from './routes/gamification.js';
import ecommerceRoutes from './routes/ecommerce.js';

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/virtual', virtualRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/ecommerce', ecommerceRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

connectDB().then(() => {
  app.listen(config.port, () => console.log(`🚀 API running on port ${config.port}`));
});
