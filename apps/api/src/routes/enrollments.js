import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Enrollment from '../models/Enrollment.js';
import EnrollmentRequest from '../models/EnrollmentRequest.js';
import WaitlistEntry from '../models/WaitlistEntry.js';
import PaymentRecord from '../models/PaymentRecord.js';
import Course from '../models/Course.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

// Manual enrollment
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const enrollment = await Enrollment.findOneAndUpdate(
      { course: req.body.course, user: req.body.user },
      { ...req.body, enrolledBy: req.user._id, status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    await logActivity({ user: req.user._id, action: 'ENROLLMENT_CREATED', entityType: 'ENROLLMENT', entityId: enrollment._id, metadata: req.body, req });
    res.json(enrollment);
  })
);

// Self enrollment with key/visibility
router.post(
  '/self',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { courseId, enrollmentKey } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (!course.allowSelfEnrollment) return res.status(403).json({ message: 'Self enrollment disabled' });
    if (course.enrollmentKey && course.enrollmentKey !== enrollmentKey) {
      return res.status(403).json({ message: 'Invalid enrollment key' });
    }
    const activeCount = await Enrollment.countDocuments({ course: courseId, status: 'ACTIVE' });
    if (course.enrollmentLimit && activeCount >= course.enrollmentLimit) {
      const waitlist = await WaitlistEntry.findOneAndUpdate(
        { course: courseId, user: req.user._id },
        { course: courseId, user: req.user._id, position: activeCount + 1 },
        { upsert: true, new: true }
      );
      return res.json({ waitlisted: true, waitlist });
    }
    const enrollment = await Enrollment.findOneAndUpdate(
      { course: courseId, user: req.user._id },
      { course: courseId, user: req.user._id, status: 'ACTIVE', enrollmentSource: 'SELF' },
      { upsert: true, new: true }
    );
    res.json(enrollment);
  })
);

// Enrollment request workflow
router.post(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const request = await EnrollmentRequest.findOneAndUpdate(
      { course: req.body.course, user: req.user._id },
      { ...req.body, user: req.user._id },
      { upsert: true, new: true }
    );
    res.json(request);
  })
);

router.post(
  '/requests/:id/approve',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const request = await EnrollmentRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED', approvalBy: req.user._id },
      { new: true }
    );
    if (request) {
      await Enrollment.findOneAndUpdate(
        { course: request.course, user: request.user },
        { course: request.course, user: request.user, status: 'ACTIVE' },
        { upsert: true, new: true }
      );
    }
    res.json(request);
  })
);

router.post(
  '/requests/:id/reject',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const request = await EnrollmentRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED', approvalBy: req.user._id },
      { new: true }
    );
    res.json(request);
  })
);

// Payment record integration
router.post(
  '/payments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payment = await PaymentRecord.create({ ...req.body, user: req.user._id });
    res.json(payment);
  })
);

router.get(
  '/course/:courseId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ course: req.params.courseId }).populate('user', 'name email role');
    res.json(enrollments);
  })
);

export default router;
