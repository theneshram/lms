import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Assignment from '../models/Assignment.js';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  const { courseId } = req.query;
  const q = courseId ? { course: courseId } : {};
  const list = await Assignment.find(q).sort({ dueDate: 1 });
  res.json(list);
});

router.post('/', requireAuth, requireRole('admin','teacher','ta'), async (req, res) => {
  const { course, title, description, dueDate, maxPoints } = req.body;
  const a = await Assignment.create({ course, title, description, dueDate, maxPoints });
  res.status(201).json(a);
});

export default router;