import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'Email in use' });
  const user = await User.create({ name, email, password, role });
  res.json({ id: user._id });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.compare(password))) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
}));

export default router;