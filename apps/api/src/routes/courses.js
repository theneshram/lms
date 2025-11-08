import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ContentItem from '../models/ContentItem.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

// Create course (Teacher/Admin)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const course = await Course.create({ ...req.body, createdBy: req.user._id });
    await Enrollment.create({ course: course._id, user: req.user._id, role: 'TEACHER' });
    await logActivity({ user: req.user._id, action: 'COURSE_CREATED', entityType: 'COURSE', entityId: course._id, metadata: req.body, req });
    res.json(course);
  })
);

// Update course metadata
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logActivity({ user: req.user._id, action: 'COURSE_UPDATED', entityType: 'COURSE', entityId: req.params.id, metadata: req.body, req });
    res.json(updated);
  })
);

// Delete course
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await Course.findByIdAndDelete(req.params.id);
    await Enrollment.deleteMany({ course: req.params.id });
    await ContentItem.deleteMany({ course: req.params.id });
    await logActivity({ user: req.user._id, action: 'COURSE_DELETED', entityType: 'COURSE', entityId: req.params.id, req });
    res.json({ success: true });
  })
);

// Clone course
router.post(
  '/:id/clone',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const original = await Course.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Course not found' });
    const clone = original.toObject();
    delete clone._id;
    clone.code = req.body.code;
    clone.title = req.body.title ?? `${original.title} (Copy)`;
    const newCourse = await Course.create({ ...clone, createdBy: req.user._id, contentVersion: 1 });
    const content = await ContentItem.find({ course: original._id });
    await Promise.all(
      content.map((item) => {
        const data = item.toObject();
        delete data._id;
        return ContentItem.create({ ...data, course: newCourse._id });
      })
    );
    await logActivity({ user: req.user._id, action: 'COURSE_CLONED', entityType: 'COURSE', entityId: newCourse._id, metadata: { from: original._id }, req });
    res.json(newCourse);
  })
);

// Bulk import courses
router.post(
  '/bulk/import',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { courses } = req.body;
    const created = await Course.insertMany(
      courses.map((course) => ({ ...course, createdBy: req.user._id })),
      { ordered: false }
    );
    await logActivity({ user: req.user._id, action: 'COURSE_BULK_IMPORT', entityType: 'COURSE', metadata: { count: created.length }, req });
    res.json({ count: created.length });
  })
);

// Export courses (basic metadata only)
router.get(
  '/bulk/export',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const courses = await Course.find().lean();
    res.json({ courses });
  })
);

// List courses visible to user
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'ADMIN') {
      const all = await Course.find().sort('-createdAt');
      return res.json(all);
    }
    const enrollments = await Enrollment.find({ user: req.user._id }).select('course');
    const ids = enrollments.map((e) => e.course);
    const publicCourses = await Course.find({ visibility: 'PUBLIC' });
    const courses = await Course.find({ _id: { $in: ids } });
    res.json([...publicCourses, ...courses]);
  })
);

// Fetch by id (only if admin or enrolled or public)
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'ADMIN') return res.json(course);
    if (course.visibility === 'PUBLIC') return res.json(course);
    const isEnrolled = await Enrollment.findOne({ course: id, user: req.user._id });
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled' });
    res.json(course);
  })
);

// Update modules and content hierarchy via drag-and-drop payload
router.post(
  '/:id/modules',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { modules: req.body.modules }, $inc: { contentVersion: 1 } },
      { new: true }
    );
    await logActivity({ user: req.user._id, action: 'COURSE_MODULES_UPDATED', entityType: 'COURSE', entityId: req.params.id, req });
    res.json(updated);
  })
);

// Manage course visibility
router.post(
  '/:id/visibility',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const updated = await Course.findByIdAndUpdate(req.params.id, { visibility: req.body.visibility }, { new: true });
    res.json(updated);
  })
);

export default router;
