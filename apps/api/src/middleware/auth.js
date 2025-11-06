import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(payload.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Invalid user' });
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}