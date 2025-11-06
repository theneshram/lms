import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Submission from '../models/Submission.js';

const router = Router();

router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const { assignment, contentUrl, textAnswer } = req.body;
  const s = await Submission.create({ assignment, student: req.user.id, contentUrl, textAnswer });
  res.status(201).json(s);
});

router.post('/:id/grade', requireAuth, requireRole('teacher','ta','admin'), async (req, res) => {
  const { id } = req.params;
  const { score, feedback } = req.body;
  const updated = await Submission.findByIdAndUpdate(id, { score, feedback }, { new: true });
  res.json(updated);
});

router.get('/', requireAuth, async (req, res) => {
  const { assignment } = req.query;
  const q = assignment ? { assignment } : { student: req.user.id };
  const list = await Submission.find(q).sort({ createdAt: -1 });
  res.json(list);
});

export default router;