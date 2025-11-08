import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import ContentItem from '../models/ContentItem.js';
import Course from '../models/Course.js';
import ResourceLibraryItem from '../models/ResourceLibraryItem.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const content = await ContentItem.create(req.body);
    await logActivity({ user: req.user._id, action: 'CONTENT_CREATED', entityType: 'CONTENT', entityId: content._id, metadata: req.body, req });
    res.json(content);
  })
);

router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const content = await ContentItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, $inc: { latestVersion: 1 } },
      { new: true }
    );
    res.json(content);
  })
);

router.get(
  '/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const content = await ContentItem.find({ course: req.params.courseId });
    res.json(content);
  })
);

router.post(
  '/library',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const item = await ResourceLibraryItem.create({ ...req.body, createdBy: req.user._id });
    res.json(item);
  })
);

router.get(
  '/library',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const filter = q ? { $text: { $search: q } } : {};
    const items = await ResourceLibraryItem.find(filter);
    res.json(items);
  })
);

export default router;
