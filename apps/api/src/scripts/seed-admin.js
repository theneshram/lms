import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db.js';
import User from '../models/User.js';

dotenv.config();
await connectDB();

const email = 'admin@example.com';
const password = 'password';
const name = 'Admin';
const role = 'admin';

const existing = await User.findOne({ email });
if (existing) {
  console.log('Admin already exists');
} else {
  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, role });
  console.log('Admin created:', email, password);
}
process.exit(0);