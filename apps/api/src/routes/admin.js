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
import {
  compileWelcomeEmail,
  ensureActivityReferences,
  normalizeActivityPayload,
  normalizeAssetPayload,
  normalizeSectionPayload,
  sanitizeSearchInput,
} from '../utils/courseBuilder.js';

const router = Router();

const COURSE_BUILDER_SELECT =
  'code title description image startDate endDate durationWeeks category subject level department tags visibility enrollmentLimit enrollmentExpiryDays allowSelfEnrollment enrollmentKey modules resources sections assets timeline notifications communication welcomeMessage metadata contentVersion builderVersion createdBy teachingAssistants prerequisites';

const COURSE_NOT_FOUND = { message: 'Course not found' };
const PARTICIPANT_ROLES = ['STUDENT', 'TEACHER', 'TA'];

function ensureCourseOr404(res, course) {
  if (!course) {
    res.status(404).json(COURSE_NOT_FOUND);
    return false;
  }
  return true;
}

async function triggerWelcomeEmailBroadcast(course) {
  const template = course.communication?.welcomeEmail;
  if (!template?.enabled) return;
  const enrollments = await Enrollment.find({ course: course._id, status: 'ACTIVE' }).populate('user', 'name email');
  await Promise.all(
    enrollments
      .filter((enrollment) => enrollment.user?.email)
      .map((enrollment) => {
        const { subject, html, text } = compileWelcomeEmail(course, enrollment.user, template);
        return sendMail({ to: enrollment.user.email, subject, html, text });
      })
  );
}

function toParticipantResponse(enrollment) {
  const user = enrollment.user || {};
  return {
    id: enrollment._id,
    userId: user._id || enrollment.user,
    name: user.name,
    email: user.email,
    role: enrollment.role,
    status: enrollment.status,
    enrolledAt: enrollment.createdAt,
  };
}

function coerceParticipantRole(role) {
  if (!role) return 'STUDENT';
  const upper = role.toUpperCase();
  return PARTICIPANT_ROLES.includes(upper) ? upper : 'STUDENT';
}

// Lightweight user search for enrollment workflows (rate limit via API gateway reverse proxy if necessary)
router.get(
  '/users/search',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const q = (req.query?.q || '').toString().trim();
    if (!q) return res.json([]);
    const regex = new RegExp(sanitizeSearchInput(q), 'i');
    const users = await User.find({ $or: [{ name: regex }, { email: regex }] })
      .select('name email role')
      .limit(20)
      .lean();
    res.json(users);
  })
);

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
    const active = getCurrentDatabaseConfig();
    const stored = settings.database?.toObject?.() ?? settings.database ?? {};
    const normalizedStored = {
      ...stored,
      provider: 'LOCAL',
      uri: active.uri,
      dbName: active.dbName,
    };
    if (!stored?.provider || stored.provider !== 'LOCAL' || stored.uri !== active.uri) {
      settings.database = normalizedStored;
      await settings.save();
    }
    res.json({
      message: 'Database configuration is locked to the local MongoDB instance managed by the API environment.',
      stored: normalizedStored,
      active,
    });
  })
);

router.post(
  '/settings/database/apply',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { uri, dbName } = req.body ?? {};
    const settings = await SystemSetting.getSingleton();

    try {
      await reconnectDatabase({ uri, dbName });
    } catch (error) {
      if (error?.code === 'DB_SWITCH_DISABLED') {
        return res.status(400).json({
          message:
            'This deployment uses the local MongoDB instance defined via environment variables. Update those values to change the connection.',
          code: error.code,
        });
      }
      throw error;
    }

    const active = getCurrentDatabaseConfig();
    settings.database = {
      ...(settings.database?.toObject?.() ?? settings.database ?? {}),
      provider: 'LOCAL',
      uri: active.uri,
      dbName: active.dbName,
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
  '/courses',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { status, visibility, q } = req.query ?? {};
    const query = {};
    const now = new Date();
    if (visibility) query.visibility = visibility.toString().toUpperCase();
    if (q) {
      const regex = new RegExp(sanitizeSearchInput(q), 'i');
      query.$or = [{ title: regex }, { code: regex }];
    }
    if (status === 'upcoming') {
      query.startDate = { $gt: now };
    } else if (status === 'archived') {
      query.endDate = { $lt: now };
    } else if (status === 'active') {
      query.$and = [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ];
    }
    const courses = await Course.find(query)
      .select('code title visibility startDate endDate level durationWeeks timeline.sections assets contentVersion builderVersion updatedAt createdAt image')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(courses);
  })
);

router.post(
  '/courses',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const payload = { ...(req.body ?? {}), createdBy: req.user._id };
    const created = await Course.create(payload);
    const course = await Course.findById(created._id).select(COURSE_BUILDER_SELECT).lean();
    res.status(201).json(course);
  })
);

router.get(
  '/courses/:courseId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId).select(COURSE_BUILDER_SELECT).lean();
    if (!ensureCourseOr404(res, course)) return;
    res.json(course);
  })
);

router.put(
  '/courses/:courseId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const wasWelcomeEnabled = course.communication?.welcomeEmail?.enabled;
    course.set(req.body ?? {});
    await course.save();
    const isWelcomeEnabled = course.communication?.welcomeEmail?.enabled;
    if (!wasWelcomeEnabled && isWelcomeEnabled) {
      triggerWelcomeEmailBroadcast(course).catch((error) => console.error('[courses] failed welcome broadcast', error));
    }
    res.json(course);
  })
);

router.delete(
  '/courses/:courseId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findByIdAndDelete(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    res.status(204).send();
  })
);

router.post(
  '/courses/:courseId/sections',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const section = normalizeSectionPayload(course, req.body);
    await Promise.all(section.activities.map((activity) => ensureActivityReferences(activity)));
    course.sections.push(section);
    course.markModified('sections');
    await course.save();
    res.status(201).json(section);
  })
);

router.put(
  '/courses/:courseId/sections/:sectionId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    Object.assign(section, req.body ?? {});
    await Promise.all(section.activities.map((activity) => ensureActivityReferences(activity)));
    course.markModified('sections');
    await course.save();
    res.json(section);
  })
);

router.delete(
  '/courses/:courseId/sections/:sectionId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    section.remove();
    course.markModified('sections');
    await course.save();
    res.status(204).send();
  })
);

router.post(
  '/courses/:courseId/sections/:sectionId/activities',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    const activity = normalizeActivityPayload(req.body);
    await ensureActivityReferences(activity);
    section.activities.push(activity);
    course.markModified('sections');
    await course.save();
    res.status(201).json(activity);
  })
);

router.put(
  '/courses/:courseId/sections/:sectionId/activities/:activityId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    const activity = section.activities.id(req.params.activityId);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    Object.assign(activity, req.body ?? {});
    await ensureActivityReferences(activity);
    course.markModified('sections');
    await course.save();
    res.json(activity);
  })
);

router.delete(
  '/courses/:courseId/sections/:sectionId/activities/:activityId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });
    const activity = section.activities.id(req.params.activityId);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    activity.remove();
    course.markModified('sections');
    await course.save();
    res.status(204).send();
  })
);

router.post(
  '/courses/:courseId/assets',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const asset = normalizeAssetPayload(req.body);
    course.assets.push(asset);
    course.markModified('assets');
    await course.save();
    res.status(201).json(asset);
  })
);

router.put(
  '/courses/:courseId/assets/:assetId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const asset = course.assets.id(req.params.assetId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    Object.assign(asset, req.body ?? {});
    course.markModified('assets');
    await course.save();
    res.json(asset);
  })
);

router.delete(
  '/courses/:courseId/assets/:assetId',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const asset = course.assets.id(req.params.assetId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    asset.remove();
    course.markModified('assets');
    await course.save();
    res.status(204).send();
  })
);

router.get(
  '/courses/:courseId/participants',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ course: req.params.courseId }).populate('user', 'name email role').lean();
    res.json(enrollments.map((enrollment) => toParticipantResponse(enrollment)));
  })
);

router.post(
  '/courses/:courseId/participants',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { userId, role, sendWelcome } = req.body ?? {};
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;
    const enrollment = await Enrollment.findOneAndUpdate(
      { course: course._id, user: user._id },
      { course: course._id, user: user._id, role: coerceParticipantRole(role), status: 'ACTIVE', enrolledBy: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('user', 'name email role');
    if (sendWelcome || course.communication?.welcomeEmail?.enabled) {
      try {
        const { subject, html, text } = compileWelcomeEmail(course, user, course.communication?.welcomeEmail || {});
        await sendMail({ to: user.email, subject, html, text });
      } catch (error) {
        console.warn('[participants] welcome email failed', error);
      }
    }
    res.status(201).json(toParticipantResponse(enrollment));
  })
);

router.put(
  '/courses/:courseId/participants/:userId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const role = coerceParticipantRole(req.body?.role);
    const enrollment = await Enrollment.findOneAndUpdate(
      { course: req.params.courseId, user: req.params.userId },
      { role },
      { new: true }
    ).populate('user', 'name email role');
    if (!enrollment) return res.status(404).json({ message: 'Participant not found' });
    res.json(toParticipantResponse(enrollment));
  })
);

router.delete(
  '/courses/:courseId/participants/:userId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    await Enrollment.findOneAndDelete({ course: req.params.courseId, user: req.params.userId });
    res.status(204).send();
  })
);

router.post(
  '/courses/:courseId/participants/bulk',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const { csv, defaultRole = 'STUDENT', sendWelcome = false } = req.body ?? {};
    if (!csv || typeof csv !== 'string') return res.status(400).json({ message: 'csv payload required' });
    const rows = csv
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);
    if (!rows.length) return res.status(400).json({ message: 'No rows provided' });
    const course = await Course.findById(req.params.courseId);
    if (!ensureCourseOr404(res, course)) return;

    const results = [];
    for (const row of rows) {
      const [emailToken, roleToken] = row.split(',').map((part) => part?.trim());
      if (!emailToken) continue;
      const emailRegex = new RegExp(`^${sanitizeSearchInput(emailToken)}$`, 'i');
      const user = await User.findOne({ email: emailRegex });
      if (!user) {
        results.push({ email: emailToken, status: 'user_not_found' });
        continue;
      }
      const role = roleToken ? coerceParticipantRole(roleToken) : coerceParticipantRole(defaultRole);
      const enrollment = await Enrollment.findOneAndUpdate(
        { course: course._id, user: user._id },
        { course: course._id, user: user._id, role, status: 'ACTIVE', enrolledBy: req.user._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (sendWelcome || course.communication?.welcomeEmail?.enabled) {
        try {
          const { subject, html, text } = compileWelcomeEmail(course, user, course.communication?.welcomeEmail || {});
          await sendMail({ to: user.email, subject, html, text });
        } catch (error) {
          console.warn('[participants] bulk welcome failed', error);
        }
      }
      results.push({ email: user.email, status: 'enrolled', role: enrollment.role });
    }
    res.json({ processed: results.length, results });
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
