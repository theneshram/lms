import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const users = await User.find().select('-passwordHash');
  res.json(users);
});

export default router;