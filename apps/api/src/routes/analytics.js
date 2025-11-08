import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import QuizAttempt from '../models/QuizAttempt.js';
import ReportSchedule from '../models/ReportSchedule.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.get(
  '/user-overview',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const [totalUsers, activeStudents, activeTeachers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: { $in: ['TEACHER', 'TA'] } }),
    ]);
    res.json({ totalUsers, activeStudents, activeTeachers });
  })
);

router.get(
  '/course-overview',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const courses = await Course.find();
    const enrollmentCounts = await Enrollment.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]);
    res.json({ courses, enrollmentCounts });
  })
);

router.get(
  '/progress/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const assignments = await Assignment.countDocuments({ course: req.params.courseId });
    const submissions = await Submission.countDocuments({ 'grade': { $ne: null }, assignment: { $exists: true } });
    const quizAttempts = await QuizAttempt.countDocuments({});
    res.json({ assignments, submissions, quizAttempts });
  })
);

router.post(
  '/reports',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const report = await ReportSchedule.create({ ...req.body, createdBy: req.user._id });
    res.json(report);
  })
);

router.get(
  '/reports',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const reports = await ReportSchedule.find();
    res.json(reports);
  })
);

export default router;
