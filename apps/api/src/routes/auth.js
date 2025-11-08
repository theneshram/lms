import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, profile } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email in use' });
    const user = await User.create({ name, email, password, role, profile });
    await logActivity({ user: user._id, action: 'USER_REGISTERED', entityType: 'USER', entityId: user._id, metadata: { role }, req });
    res.json({ id: user._id });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.compare(password))) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    user.lastLoginAt = new Date();
    user.activityStats.loginCount = (user.activityStats?.loginCount ?? 0) + 1;
    await user.save();
    await logActivity({ user: user._id, action: 'USER_LOGGED_IN', entityType: 'USER', entityId: user._id, req });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  })
);

export default router;
