import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

// Create course (Teacher/Admin)
router.post('/', requireAuth, requireRole('ADMIN','TEACHER'), asyncHandler(async (req, res) => {
  const course = await Course.create({ ...req.body, createdBy: req.user._id });
  await Enrollment.create({ course: course._id, user: req.user._id, role: 'TEACHER' });
  res.json(course);
}));

// List courses visible to user
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const role = req.user.role;
  if (role === 'ADMIN') {
    const all = await Course.find().sort('-createdAt');
    return res.json(all);
  }
  const enrollments = await Enrollment.find({ user: req.user._id }).select('course');
  const ids = enrollments.map(e=>e.course);
  const courses = await Course.find({ _id: { $in: ids }});
  res.json(courses);
}));

// Fetch by id (only if admin or enrolled)
router.get('/:id', requireAuth, asyncHandler(async (req,res)=>{
  const { id } = req.params;
  if (req.user.role === 'ADMIN') return res.json(await Course.findById(id));
  const isEnrolled = await Enrollment.findOne({ course: id, user: req.user._id });
  if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled' });
  res.json(await Course.findById(id));
}));

export default router;