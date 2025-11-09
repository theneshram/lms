import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import SystemSetting, { defaultPalettes, defaultTemplates } from '../models/SystemSetting.js';
import IntegrationConfig from '../models/IntegrationConfig.js';
import AutomationRule from '../models/AutomationRule.js';
import Recommendation from '../models/Recommendation.js';
import { asyncHandler } from '../utils/error.js';
import { getCurrentDatabaseConfig, reconnectDatabase } from '../utils/dbManager.js';
import { refreshMailerCache, sendMail } from '../services/mailer.js';

const router = Router();

router.get(
  '/settings',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.getSingleton();
    res.json(settings ?? {});
  })
);

router.post(
  '/settings',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const existing = await SystemSetting.getSingleton();
    const payload = req.body ?? {};
    if (payload.appearance?.palettes && !payload.appearance.palettes.length) {
      payload.appearance.palettes = defaultPalettes.map((palette) => ({
        ...palette,
        colors: { ...palette.colors },
      }));
    }
    if (payload.mail?.templates && !payload.mail.templates.length) {
      payload.mail.templates = defaultTemplates.map((template) => ({ ...template }));
    }
    const updated = await SystemSetting.findByIdAndUpdate(existing._id, payload, {
      new: true,
      runValidators: false,
    });
    if (payload.mail?.smtp) {
      await refreshMailerCache();
    }
    res.json(updated);
  })
);

router.get(
  '/settings/database',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.getSingleton();
    res.json({ stored: settings.database, active: getCurrentDatabaseConfig() });
  })
);

router.post(
  '/settings/database/apply',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { uri, dbName, provider } = req.body;
    if (!uri) return res.status(400).json({ message: 'Database URI required' });

    const settings = await SystemSetting.getSingleton();
    settings.database = {
      ...(settings.database?.toObject?.() ?? settings.database ?? {}),
      provider: provider ?? settings.database?.provider ?? 'CUSTOM',
      uri,
      dbName: dbName || settings.database?.dbName || 'lms',
      lastAppliedAt: new Date(),
      appliedBy: req.user._id,
    };
    await settings.save();

    const active = await reconnectDatabase({ uri, dbName: settings.database.dbName });
    res.json({ active, stored: settings.database });
  })
);

router.post(
  '/settings/mail/test',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { to } = req.body ?? {};
    if (!to) return res.status(400).json({ message: 'Recipient email required' });
    const result = await sendMail({
      to,
      subject: 'LMS SMTP test',
      html: '<p>This is a test email confirming SMTP configuration.</p>',
    });
    res.json(result);
  })
);

router.get(
  '/settings/palettes',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    res.json({ palettes: defaultPalettes });
  })
);

router.get(
  '/integrations',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const integrations = await IntegrationConfig.find();
    res.json(integrations);
  })
);

router.post(
  '/integrations',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const integration = await IntegrationConfig.findOneAndUpdate(
      { type: req.body.type, provider: req.body.provider },
      req.body,
      { upsert: true, new: true }
    );
    res.json(integration);
  })
);

router.post(
  '/automation-rules',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const rule = await AutomationRule.create(req.body);
    res.json(rule);
  })
);

router.get(
  '/automation-rules',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const rules = await AutomationRule.find();
    res.json(rules);
  })
);

router.get(
  '/recommendations/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const recommendations = await Recommendation.findOne({ user: req.params.userId });
    res.json(recommendations ?? { courses: [] });
  })
);

router.post(
  '/recommendations/:userId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const recommendation = await Recommendation.findOneAndUpdate(
      { user: req.params.userId },
      { user: req.params.userId, courses: req.body.courses, generatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(recommendation);
  })
);

export default router;
