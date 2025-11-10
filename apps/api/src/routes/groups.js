import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Group from '../models/Group.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const group = await Group.create({ ...req.body, owner: req.user._id });
    res.json(group);
  })
);

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const groups = await Group.find(req.query).populate('members', 'name email');
    res.json(groups);
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
