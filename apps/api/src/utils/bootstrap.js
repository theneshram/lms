import User from '../models/User.js';

export async function ensureSuperAdmin(adminConfig = {}) {
  const email = adminConfig.email?.trim();
  const password = adminConfig.password;
  const name = adminConfig.name?.trim() || 'Super Admin';

  if (!email || !password) {
    console.warn('[bootstrap] ADMIN_EMAIL and ADMIN_PASSWORD must be set to auto-provision the super admin.');
    return;
  }

  const existing = await User.findOne({ email }).select('+password');
  if (!existing) {
    await User.create({ name, email, password, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    console.log(`[bootstrap] created super admin account for ${email}`);
    return;
  }

  let updated = false;
  let passwordRefreshed = false;
  if (existing.role !== 'SUPER_ADMIN') {
    existing.role = 'SUPER_ADMIN';
    updated = true;
  }
  if (existing.status !== 'ACTIVE') {
    existing.status = 'ACTIVE';
    updated = true;
  }
  if (existing.name !== name) {
    existing.name = name;
    updated = true;
  }

  if (password) {
    const hasPassword = typeof existing.password === 'string' && existing.password.length > 0;
    let matches = false;
    if (hasPassword) {
      try {
        matches = await existing.compare(password);
      } catch (err) {
        matches = false;
      }
    }

    if (!matches) {
      existing.password = password;
      passwordRefreshed = true;
      updated = true;
    }
  }

  if (updated) {
    await existing.save();
    console.log(
      `[bootstrap] ensured super admin privileges for ${email}${passwordRefreshed ? ' (password refreshed)' : ''}`
    );
  } else {
    console.log(`[bootstrap] super admin already configured for ${email}`);
  }
}
