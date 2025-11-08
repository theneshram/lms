import User from '../models/User.js';

export async function ensureSuperAdmin(adminConfig = {}) {
  const email = adminConfig.email?.trim();
  const password = adminConfig.password;
  const name = adminConfig.name?.trim() || 'Super Admin';

  if (!email || !password) {
    console.warn('[bootstrap] ADMIN_EMAIL and ADMIN_PASSWORD must be set to auto-provision the super admin.');
    return;
  }

  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name, email, password, role: 'ADMIN', status: 'ACTIVE' });
    console.log(`[bootstrap] created super admin account for ${email}`);
    return;
  }

  let updated = false;
  if (existing.role !== 'ADMIN') {
    existing.role = 'ADMIN';
    updated = true;
  }
  if (existing.status !== 'ACTIVE') {
    existing.status = 'ACTIVE';
    updated = true;
  }

  if (updated) {
    await existing.save();
    console.log(`[bootstrap] ensured super admin privileges for ${email}`);
  }
}
