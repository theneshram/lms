// Run: node apps/api/scripts/create-admin.mjs --email admin@lms.com --password StrongP@ss! --name "Site Admin"

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// If you already have these in your codebase, reuse them:
import { connectDB } from '../src/db.js';
import User from '../src/models/User.js'; // Adjust path if your User model differs

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const email = arg('email', process.env.ADMIN_EMAIL || 'admin@lms.com');
const password = arg('password', process.env.ADMIN_PASSWORD || 'ChangeMe!123');
const name = arg('name', process.env.ADMIN_NAME || 'Administrator');
const role = arg('role', 'admin');

(async () => {
  try {
    // Connect using your existing helper (preferred) or fallback to MONGO_URI
    if (typeof connectDB === 'function') {
      await connectDB();
    } else {
      await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB || undefined });
    }

    let user = await User.findOne({ email });
    const hash = await bcrypt.hash(password, 10);

    if (!user) {
      user = await User.create({ name, email, password: hash, role });
      console.log('✅ Admin created:', { id: user._id.toString(), email, role });
    } else {
      // If user exists, just ensure they’re admin and reset password
      user.password = hash;
      user.role = role;
      user.name = name || user.name;
      await user.save();
      console.log('✅ Admin updated (password reset):', { id: user._id.toString(), email, role });
    }
  } catch (err) {
    console.error('❌ Failed to create/update admin:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
})();
