import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import VirtualSession from '../models/VirtualSession.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const session = await VirtualSession.create(req.body);
    res.json(session);
  })
);

router.get(
  '/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await VirtualSession.find({ course: req.params.courseId });
    res.json(sessions);
  })
);

router.post(
  '/:id/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await VirtualSession.findByIdAndUpdate(
      req.params.id,
      { $push: { attendees: { user: req.user._id, joinedAt: new Date() } } },
      { new: true }
    );
    res.json(updated);
  })
);

router.post(
  '/:id/polls',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const session = await VirtualSession.findByIdAndUpdate(
      req.params.id,
      { $push: { polls: req.body } },
      { new: true }
    );
    res.json(session);
  })
);

export default router;
