import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

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

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { name, email, password, role = 'STUDENT', status = 'ACTIVE' } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const user = await User.create({ name, email, password, role, status });
    await logActivity({
      user: req.user._id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user._id,
      metadata: { createdRole: role },
      req,
    });

    const safeUser = await User.findById(user._id).select('-password');
    res.status(201).json(safeUser);
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
