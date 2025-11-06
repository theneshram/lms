import { Router } from 'express';
import Course from '../models/Course.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Create course (ADMIN/TEACHER)
router.post('/', requireAuth(['ADMIN', 'TEACHER']), async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      code: req.body.code,
      description: req.body.description,
      thumbnailUrl: req.body.thumbnailUrl,
      bannerUrl: req.body.bannerUrl,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      durationWeeks: req.body.durationWeeks,
      credits: req.body.credits,
      tags: req.body.tags,
      category: req.body.category,
      department: req.body.department,
      createdBy: req.user?.sub,
    };
    const course = await Course.create(payload);
    return res.json({ ok: true, course });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

// List courses
router.get('/', async (_req, res) => {
  const courses = await Course.find().sort({ createdAt: -1 }).limit(200);
  return res.json({ ok: true, courses });
});

// Get one
router.get('/:id', async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ ok: false, error: 'Not found' });
  return res.json({ ok: true, course });
});

export default router;
