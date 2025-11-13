import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import SystemSetting, { defaultPalettes, defaultTemplates } from '../models/SystemSetting.js';
import IntegrationConfig from '../models/IntegrationConfig.js';
import AutomationRule from '../models/AutomationRule.js';
import Recommendation from '../models/Recommendation.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import VirtualSession from '../models/VirtualSession.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/error.js';
import { getCurrentDatabaseConfig, reconnectDatabase, getDatabaseDiagnostics, normalizeMongoError } from '../utils/dbManager.js';
import { refreshMailerCache, sendMail } from '../services/mailer.js';
import { getStorageFootprint } from '../utils/storage.js';

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
      lastErrorAt: null,
      lastErrorMessage: null,
      lastErrorCode: null,
    };
    try {
      const diagnostics = await reconnectDatabase({ uri, dbName: settings.database.dbName });
      if (diagnostics?.connected) {
        settings.database.lastConnectedAt = new Date();
        settings.database.lastLatencyMs = diagnostics?.pingMs ?? null;
        settings.database.lastErrorAt = null;
        settings.database.lastErrorMessage = null;
        settings.database.lastErrorCode = null;
      }
      await settings.save();
      res.json({ active: diagnostics, stored: settings.database });
    } catch (error) {
      const normalized = normalizeMongoError(error);
      settings.database.lastErrorAt = new Date();
      settings.database.lastErrorMessage = normalized.userMessage || normalized.message;
      settings.database.lastErrorCode = normalized.code || null;
      await settings.save();
      return res.status(502).json({
        message:
          normalized.userMessage ||
          'Unable to connect to the provided database. Verify credentials and network access.',
        code: normalized.code || 'DB_CONNECTION_FAILED',
      });
    }
  })
);

router.get(
  '/settings/database/status',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    try {
      const diagnostics = await getDatabaseDiagnostics();
      res.json(diagnostics);
    } catch (error) {
      const normalized = normalizeMongoError(error);
      res.status(502).json({
        message:
          normalized.userMessage ||
          'Unable to retrieve database diagnostics. Confirm the database is reachable and IPs are whitelisted.',
        code: normalized.code || 'DB_DIAGNOSTICS_FAILED',
      });
    }
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
  '/overview',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const [settings, storage] = await Promise.all([SystemSetting.getSingleton(), getStorageFootprint()]);

    let database = null;
    try {
      const stats = await mongoose.connection?.db?.command?.({ dbStats: 1, scale: 1024 * 1024 });
      if (stats) {
        database = {
          name: mongoose.connection.db.databaseName,
          collections: stats.collections,
          objects: stats.objects,
          storageSizeMb: Number((stats.storageSize || 0).toFixed(2)),
          dataSizeMb: Number((stats.dataSize || 0).toFixed(2)),
          indexSizeMb: Number((stats.indexSize || 0).toFixed(2)),
          avgObjSizeKb: stats.avgObjSize ? Number((stats.avgObjSize / 1024).toFixed(2)) : null,
        };
      }
    } catch (error) {
      console.warn('[admin] Unable to compute database statistics', error);
    }

    const now = new Date();
    const [
      totalUsers,
      studentCount,
      teacherCount,
      adminCount,
      courseCount,
      publicCourseCount,
      upcomingCourseCount,
      enrollmentCount,
      sessionCount,
      upcomingSessions,
      activeUsers,
      recentLogs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: { $in: ['TEACHER', 'TA'] } }),
      User.countDocuments({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } }),
      Course.countDocuments(),
      Course.countDocuments({ visibility: 'PUBLIC' }),
      Course.countDocuments({ startDate: { $gte: now } }),
      Enrollment.countDocuments(),
      VirtualSession.countDocuments(),
      VirtualSession.find({ startAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } })
        .select('title startAt endAt provider course')
        .sort({ startAt: 1 })
        .limit(10)
        .populate({ path: 'course', select: 'title code' })
        .lean(),
      User.find({ lastLoginAt: { $gte: new Date(now.getTime() - 15 * 60 * 1000) } })
        .select('name email role lastLoginAt')
        .sort({ lastLoginAt: -1 })
        .limit(25)
        .lean(),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(25)
        .populate({ path: 'user', select: 'name email role' })
        .lean(),
    ]);

    const counts = {
      users: {
        total: totalUsers,
        students: studentCount,
        teachers: teacherCount,
        admins: adminCount,
      },
      courses: {
        total: courseCount,
        published: publicCourseCount,
        upcoming: upcomingCourseCount,
      },
      enrollments: enrollmentCount,
      sessions: sessionCount,
    };

    res.json({
      counts,
      storage,
      database,
      activeUsers: activeUsers.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      })),
      recentLogs: recentLogs.map((log) => ({
        id: log._id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        occurredAt: log.occurredAt || log.createdAt,
        user: log.user
          ? {
              id: log.user._id,
              name: log.user.name,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
      })),
      upcomingSessions,
      settings: {
        demoCourse: settings.demoCourse ?? {},
        storage: settings.storage ?? {},
        observability: settings.observability ?? {},
      },
    });
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
