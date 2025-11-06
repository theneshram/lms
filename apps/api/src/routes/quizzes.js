import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN','TEACHER','TA'), asyncHandler(async (req,res)=>{
  res.json(await Quiz.create(req.body));
}));

router.get('/course/:courseId', requireAuth, asyncHandler(async (req,res)=>{
  res.json(await Quiz.find({ course: req.params.courseId, published: true }));
}));

router.post('/:id/publish', requireAuth, requireRole('ADMIN','TEACHER'), asyncHandler(async (req,res)=>{
  res.json(await Quiz.findByIdAndUpdate(req.params.id, { published: true }, { new: true }));
}));

router.post('/:id/attempt', requireAuth, requireRole('STUDENT'), asyncHandler(async (req,res)=>{
  const quiz = await Quiz.findById(req.params.id);
  const { responses } = req.body;
  let score = 0;
  quiz.questions.forEach((q, i)=>{
    if (JSON.stringify(q.answer) === JSON.stringify(responses[i])) score += q.points ?? 1;
  });
  const attempt = await QuizAttempt.create({ quiz: quiz._id, student: req.user._id, responses, score, startedAt: new Date(), submittedAt: new Date() });
  res.json(attempt);
}));

export default router;