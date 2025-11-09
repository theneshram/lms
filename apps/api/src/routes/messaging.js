import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import MessageThread from '../models/MessageThread.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Announcement from '../models/Announcement.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post(
  '/threads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const thread = await MessageThread.create({ ...req.body, participants: req.body.participants ?? [{ user: req.user._id, role: 'OWNER' }] });
    res.json(thread);
  })
);

router.get(
  '/threads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const threads = await MessageThread.find({ 'participants.user': req.user._id });
    res.json(threads);
  })
);

router.post(
  '/threads/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await Message.create({ thread: req.params.id, sender: req.user._id, ...req.body });
    res.json(message);
  })
);

router.get(
  '/threads/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const messages = await Message.find({ thread: req.params.id }).sort('createdAt');
    res.json(messages);
  })
);

router.post(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notification = await Notification.create({ ...req.body, user: req.body.user ?? req.user._id });
    res.json(notification);
  })
);

router.get(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt');
    res.json(notifications);
  })
);

router.post(
  '/announcements',
  requireAuth,
  asyncHandler(async (req, res) => {
    const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });
    res.json(announcement);
  })
);

router.get(
  '/announcements/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const announcements = await Announcement.find({ course: req.params.courseId }).sort('-createdAt');
    res.json(announcements);
  })
);

export default router;
