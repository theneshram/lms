import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import VirtualSession from '../models/VirtualSession.js';
import Enrollment from '../models/Enrollment.js';
import SystemSetting from '../models/SystemSetting.js';
import { asyncHandler } from '../utils/error.js';
import { queueNotification } from '../services/notificationScheduler.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const session = await VirtualSession.create(req.body);
    await queueSessionNotifications(session, req.user._id);
    res.json(session);
  })
);

router.get(
  '/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await VirtualSession.find({ course: req.params.courseId });
    res.json(sessions);
  })
);

router.get(
  '/upcoming',
  requireAuth,
  asyncHandler(async (req, res) => {
    const enrollmentIds = await Enrollment.find({ user: req.user._id }).distinct('course');
    const sessions = await VirtualSession.find({
      course: { $in: enrollmentIds },
      startAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    })
      .sort('startAt')
      .limit(20);
    res.json(sessions);
  })
);

router.post(
  '/:id/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await VirtualSession.findByIdAndUpdate(
      req.params.id,
      { $push: { attendees: { user: req.user._id, joinedAt: new Date() } } },
      { new: true }
    );
    res.json(updated);
  })
);

router.post(
  '/:id/polls',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const session = await VirtualSession.findByIdAndUpdate(
      req.params.id,
      { $push: { polls: req.body } },
      { new: true }
    );
    res.json(session);
  })
);

export default router;

async function queueSessionNotifications(session, actorId) {
  const { notifications } = session;
  if (!notifications?.enabled) return;
  const settings = await SystemSetting.getSingleton();
  const defaults = settings.notifications ?? {};
  const channels = notifications.channels?.length ? notifications.channels : defaults.defaultChannels;
  const leadStart = defaults.eventStartLeadMinutes ?? 30;
  const leadEnd = defaults.eventEndLeadMinutes ?? 15;
  const enrollments = await Enrollment.find({ course: session.course, status: 'ACTIVE' }).select('user').populate('user');
  const participants = enrollments.map((en) => en.user).filter(Boolean);
  const startAt = new Date(session.startAt);
  const endAt = session.endAt ? new Date(session.endAt) : null;

  if (notifications.includeStartReminder !== false && startAt) {
    const sendAt = new Date(startAt.getTime() - (leadStart * 60 * 1000));
    const title = `Upcoming session: ${session.title}`;
    const message = notifications.messageOverride || `Your session "${session.title}" starts at ${startAt.toLocaleString()}.`;
    await Promise.all(
      participants.map((user) =>
        queueNotification({
          user: user._id,
          type: 'SESSION_START',
          title,
          message,
          subject: title,
          sendAt: sendAt < new Date() ? new Date() : sendAt,
          channels,
          metadata: { session: session._id, actor: actorId },
        })
      )
    );
  }

  if (notifications.includeEndSummary && endAt) {
    const sendAt = new Date(endAt.getTime() + leadEnd * 60 * 1000);
    const title = `Session summary: ${session.title}`;
    const message = `The session "${session.title}" has ended. Please review any shared materials.`;
    await Promise.all(
      participants.map((user) =>
        queueNotification({
          user: user._id,
          type: 'SESSION_END',
          title,
          message,
          subject: title,
          sendAt,
          channels,
          metadata: { session: session._id, actor: actorId },
        })
      )
    );
  }
}
