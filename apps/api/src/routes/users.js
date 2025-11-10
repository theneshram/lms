import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { role, group } = req.query;
    const filters = {};
    if (role) filters.role = role;
    if (group) filters.groups = group;
    const users = await User.find(filters).populate('groups');
    res.json(users);
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('groups');
    res.json(user);
  })
);

router.patch(
  '/me/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, { profile: req.body.profile, preferences: req.body.preferences }, { new: true });
    res.json(user);
  })
);

router.patch(
  '/:id/role',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    res.json(user);
  })
);

router.post(
  '/:id/groups',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const group = await Group.findById(req.body.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    await Group.findByIdAndUpdate(group._id, { $addToSet: { members: req.params.id } });
    const user = await User.findByIdAndUpdate(req.params.id, { $addToSet: { groups: group._id } }, { new: true });
    res.json(user);
  })
);

router.get(
  '/:id/activity',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const activity = await ActivityLog.find({ user: req.params.id }).sort('-createdAt').limit(100);
    res.json(activity);
  })
);

export default router;
