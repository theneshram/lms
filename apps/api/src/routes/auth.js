import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';
import { sendTemplateMail } from '../services/mailer.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, profile } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email in use' });
    const user = await User.create({ name, email, password, role, profile });
    await logActivity({ user: user._id, action: 'USER_REGISTERED', entityType: 'USER', entityId: user._id, metadata: { role }, req });
    await sendTemplateMail('user-welcome', { to: user.email, context: { name: user.name } }).catch(() => {});
    res.json({ id: user._id });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.compare(password))) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken(user);
    user.lastLoginAt = new Date();
    user.activityStats.loginCount = (user.activityStats?.loginCount ?? 0) + 1;
    await user.save();
    await logActivity({ user: user._id, action: 'USER_LOGGED_IN', entityType: 'USER', entityId: user._id, req });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  })
);

router.post(
  '/sso/login',
  asyncHandler(async (req, res) => {
    const { provider, email, name, externalId } = req.body;
    if (!provider || !email) return res.status(400).json({ message: 'provider and email required' });
    const settings = await SystemSetting.getSingleton();
    const directory = settings.directory ?? {};
    if (!directory.enabled || directory.provider !== provider) {
      return res.status(403).json({ message: 'SSO provider not enabled' });
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email,
        email,
        password: crypto.randomBytes(24).toString('hex'),
        role: directory.defaultRole || 'STUDENT',
        sso: { provider, providerId: externalId || email },
        status: 'ACTIVE',
      });
      await logActivity({ user: user._id, action: 'USER_SSO_CREATED', entityType: 'USER', entityId: user._id, req });
      await sendTemplateMail('user-welcome', { to: user.email, context: { name: user.name } }).catch(() => {});
    } else {
      user.sso = { provider, providerId: externalId || user.sso?.providerId || email, metadata: req.body.metadata };
      await user.save();
    }
    const token = signToken(user);
    await logActivity({ user: user._id, action: 'USER_SSO_LOGIN', entityType: 'USER', entityId: user._id, req });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  })
);

router.post(
  '/password/reset-request',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({});
    const token = crypto.randomBytes(16).toString('hex');
    user.passwordReset = { token, expiresAt: new Date(Date.now() + 1000 * 60 * 60) };
    await user.save();
    await sendTemplateMail('password-reset', { to: user.email, context: { name: user.name, token } }).catch(() => {});
    res.json({ sent: true });
  })
);

router.post(
  '/password/reset-confirm',
  asyncHandler(async (req, res) => {
    const { email, token, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.passwordReset?.token || user.passwordReset.token !== token) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    if (user.passwordReset.expiresAt && user.passwordReset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Token expired' });
    }
    user.password = password;
    user.passwordReset = {};
    await user.save();
    await logActivity({ user: user._id, action: 'USER_PASSWORD_RESET', entityType: 'USER', entityId: user._id, req });
    res.json({ success: true });
  })
);

export default router;
