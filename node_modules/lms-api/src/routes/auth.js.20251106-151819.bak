import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role: role || 'STUDENT' });
    return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: String(user._id), email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '7d' }
    );
    return res.json({ ok: true, token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Dev-only seed admin
router.post('/dev/seed-admin', async (_req, res) => {
  const email = 'admin@lms.local';
  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await User.hashPassword('admin123');
    await User.create({ name: 'Admin', email, passwordHash, role: 'ADMIN' });
  }
  res.json({ ok: true, email, password: 'admin123' });
});

export default router;
