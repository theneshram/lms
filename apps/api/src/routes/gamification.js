import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import GamificationEvent, { LeaderboardEntry } from '../models/GamificationEvent.js';
import Quest from '../models/Quest.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/events',
  requireAuth,
  asyncHandler(async (req, res) => {
    const event = await GamificationEvent.create({ ...req.body, user: req.user._id });
    await LeaderboardEntry.findOneAndUpdate(
      { course: req.body.course, user: req.user._id },
      { $inc: { points: req.body.points ?? 0 }, level: req.body.level ?? 1 },
      { upsert: true, new: true }
    );
    res.json(event);
  })
);

router.get(
  '/leaderboard/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const leaderboard = await LeaderboardEntry.find({ course: req.params.courseId }).sort('-points').limit(50);
    res.json(leaderboard);
  })
);

router.post(
  '/quests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const quest = await Quest.create(req.body);
    res.json(quest);
  })
);

router.get(
  '/quests/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const quests = await Quest.find({ course: req.params.courseId, status: 'ACTIVE' });
    res.json(quests);
  })
);

export default router;
