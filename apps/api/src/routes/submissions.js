import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.get(
  '/assignment/:assignmentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const list = await Submission.find({ assignment: req.params.assignmentId }).populate('student', 'name email');
    res.json(list);
  })
);

router.get(
  '/me',
  requireAuth,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ student: req.user._id });
    res.json(submissions);
  })
);

router.post(
  '/:id/peer-feedback',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { score, comments } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { $push: { peerFeedback: { reviewer: req.user._id, score, comments } } },
      { new: true }
    );
    res.json(submission);
  })
);

export default router;
