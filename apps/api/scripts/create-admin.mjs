// Usage examples:
// 1) With .env (MONGO_URI set):
//    node apps/api/scripts/create-admin.mjs --email admin@lms.com --password "Admin@123" --name "Site Admin"
//
// 2) Passing Atlas URI directly (recommended if you're confused about env):
//    node apps/api/scripts/create-admin.mjs --mongo-uri "mongodb+srv://thenesh26_db_user:<db_password>@cluster0.mjs1u6c.mongodb.net/?appName=Cluster0" --db lms --email admin@lms.com --password "Admin@123" --name "Site Admin"
//
// Notes:
// - If your password has special characters (@, #, :, /, ?), URL-encode it.
// - Default DB name = "lms" (override with --db <name>)

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Try to reuse your repo's DB helper if it exists
let connectDB = null;
try {
  ({ connectDB } = await import('../src/db.js')); // keep if your file exists
} catch (_) {
  // ignore if not found
}

// === Adjust this import if your model filename differs ===
import User from '../src/models/User.js';

// ---------- helpers ----------
function getArg(flag, fallback) {
  const i = process.argv.indexOf(`--${flag}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : (fallback ?? null);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------- inputs ----------
const email = getArg('email', process.env.ADMIN_EMAIL || 'admin@lms.com');
const plainPassword = getArg('password', process.env.ADMIN_PASSWORD || 'Pass$$123');
const name = getArg('name', process.env.ADMIN_NAME || 'Administrator');
const role = getArg('role', 'admin');

// You can pass the Atlas URI from CLI or via .env
const mongoUriFromCli = getArg('mongo-uri', null);
const mongoUri = mongoUriFromCli || process.env.MONGO_URI || null;
const dbName = getArg('db', process.env.MONGO_DB || 'lms');

// ---------- validations ----------
if (!validateEmail(email)) {
  console.error('❌ Invalid --email provided.');
  process.exit(1);
}
if (!plainPassword || plainPassword.length < 8) {
  console.error('❌ --password must be at least 8 characters.');
  process.exit(1);
}

async function connect() {
  // Priority: explicit URI (CLI or env) → connectDB helper → error
  if (mongoUri) {
    await mongoose.connect(mongoUri, { dbName });
    return;
  }
  if (typeof connectDB === 'function') {
    await connectDB(); // your helper should use .env internally
    return;
  }
  throw new Error('No Mongo URI available. Provide --mongo-uri or set MONGO_URI in .env, or ensure connectDB() exists.');
}

(async () => {
  try {
    await connect();

    const hash = await bcrypt.hash(plainPassword, 10);

    const admin = await User.findOneAndUpdate(
      { email },
      { $set: { name, email, password: hash, role, isActive: true } },
      { upsert: true, new: true }
    );

    console.log('✅ Admin ready:', {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      name: admin.name,
      db: dbName
    });
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create/update admin:', err?.message || err);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch {}
  }
})();
