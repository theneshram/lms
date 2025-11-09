import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Enrollment from '../models/Enrollment.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

// create (Teacher/TA)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const assignment = await Assignment.create(req.body);
    await logActivity({ user: req.user._id, action: 'ASSIGNMENT_CREATED', entityType: 'ASSIGNMENT', entityId: assignment._id, metadata: req.body, req });
    res.json(assignment);
  })
);

// update assignment
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  })
);

// list by course (enrolled only)
router.get(
  '/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const enrolled = await Enrollment.findOne({ course: courseId, user: req.user._id });
    if (!enrolled && req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Not enrolled' });
    const query = await Assignment.find({ course: courseId }).sort('dueAt');
    res.json(query);
  })
);

// submit (student)
router.post(
  '/:id/submit',
  requireAuth,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    const attempts = await Submission.countDocuments({ assignment: id, student: req.user._id });
    if (assignment.submissionPolicy.maxAttempts && attempts >= assignment.submissionPolicy.maxAttempts) {
      return res.status(400).json({ message: 'Max attempts reached' });
    }
    const attemptNumber = attempts + 1;
    const payload = {
      assignment: id,
      student: req.user._id,
      attempt: attemptNumber,
      ...req.body,
    };
    const submission = await Submission.create(payload);
    await logActivity({ user: req.user._id, action: 'ASSIGNMENT_SUBMITTED', entityType: 'ASSIGNMENT', entityId: id, metadata: { attempt: attemptNumber }, req });
    res.json(submission);
  })
);

// grade (teacher/admin/ta)
router.post(
  '/:id/grade',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId, grade, feedback, rubricScores } = req.body;
    const updated = await Submission.findOneAndUpdate(
      { assignment: id, student: studentId },
      { grade, feedback, rubricScores, gradedBy: req.user._id },
      { new: true }
    );
    res.json(updated);
  })
);

export default router;
