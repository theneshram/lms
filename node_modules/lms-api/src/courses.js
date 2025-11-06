import { Router } from 'express';
import Course from '../models/Course.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Create course (Admin/Teacher)
router.post('/', requireAuth(['ADMIN', 'TEACHER']), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.sub };
    const course = await Course.create(data);
    res.json({ ok: true, course });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// List courses (public for now)
router.get('/', async (_req, res) => {
  const courses = await Course.find().sort({ createdAt: -1 }).limit(100);
  res.json({ ok: true, courses });
});

// Get one
router.get('/:id', async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true, course });
});

export default router;
