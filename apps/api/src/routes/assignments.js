import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Enrollment from '../models/Enrollment.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

// create (Teacher/TA)
router.post('/', requireAuth, requireRole('ADMIN','TEACHER','TA'), asyncHandler(async (req,res)=>{
  const a = await Assignment.create(req.body);
  res.json(a);
}));

// list by course (enrolled only)
router.get('/course/:courseId', requireAuth, asyncHandler(async (req,res)=>{
  const { courseId } = req.params;
  const enrolled = await Enrollment.findOne({ course: courseId, user: req.user._id });
  if (!enrolled && req.user.role !== 'ADMIN') return res.status(403).json({message:'Not enrolled'});
  res.json(await Assignment.find({ course: courseId }).sort('dueAt'));
}));

// submit (student)
router.post('/:id/submit', requireAuth, requireRole('STUDENT'), asyncHandler(async (req,res)=>{
  const { id } = req.params;
  const payload = { assignment: id, student: req.user._id, ...req.body };
  const sub = await Submission.findOneAndUpdate(
    { assignment: id, student: req.user._id },
    payload,
    { upsert: true, new: true }
  );
  res.json(sub);
}));

// grade (teacher/admin/ta)
router.post('/:id/grade', requireAuth, requireRole('ADMIN','TEACHER','TA'), asyncHandler(async (req,res)=>{
  const { id } = req.params;
  const { studentId, grade, feedback } = req.body;
  const updated = await Submission.findOneAndUpdate(
    { assignment: id, student: studentId },
    { grade, feedback, gradedBy: req.user._id },
    { new: true }
  );
  res.json(updated);
}));

export default router;