import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import QuestionBank from '../models/QuestionBank.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

// Manage question bank
router.post(
  '/banks',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.create(req.body);
    res.json(bank);
  })
);

router.put(
  '/banks/:id',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(bank);
  })
);

router.get(
  '/banks/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const banks = await QuestionBank.find({ course: req.params.courseId });
    res.json(banks);
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.create(req.body);
    await logActivity({ user: req.user._id, action: 'QUIZ_CREATED', entityType: 'QUIZ', entityId: quiz._id, metadata: req.body, req });
    res.json(quiz);
  })
);

router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(quiz);
  })
);

router.get(
  '/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = { course: req.params.courseId };
    if (req.user.role === 'STUDENT') filters.published = true;
    const quizzes = await Quiz.find(filters);
    res.json(quizzes);
  })
);

router.post(
  '/:id/publish',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, { published: true }, { new: true });
    res.json(quiz);
  })
);

router.post(
  '/:id/attempt',
  requireAuth,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.params.id).populate('bank');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const attempts = await QuizAttempt.countDocuments({ quiz: quiz._id, student: req.user._id });
    if (quiz.settings.maxAttempts && attempts >= quiz.settings.maxAttempts) {
      return res.status(400).json({ message: 'Max attempts reached' });
    }

    const questionPool = [];
    if (quiz.randomize && quiz.bank) {
      const questions = quiz.bank.questions;
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      shuffled.slice(0, quiz.questionCount || questions.length).forEach((q) => {
        questionPool.push(q);
      });
    } else if (quiz.bank) {
      questionPool.push(...quiz.bank.questions.filter((q) => quiz.questions.some((qq) => qq.questionId.equals(q._id))));
    }

    const responses = req.body.responses || [];
    let score = 0;
    let maxScore = 0;

    const scoredResponses = questionPool.map((question, index) => {
      const answer = responses[index];
      const isCorrect = JSON.stringify(question.answer) === JSON.stringify(answer);
      const questionScore = question.maxMarks ?? 1;
      const negative = quiz.settings.negativeMarking ? question.negativeMarks ?? quiz.settings.negativeMarkValue ?? 0 : 0;
      maxScore += questionScore;
      if (isCorrect) {
        score += questionScore;
      } else if (negative) {
        score -= negative;
      }
      return { questionId: question._id, response: answer, score: isCorrect ? questionScore : negative ? -negative : 0 };
    });

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user._id,
      responses: scoredResponses,
      score,
      maxScore,
      startedAt: new Date(req.body.startedAt || Date.now()),
      submittedAt: new Date(),
      status: quiz.settings.autoSubmit ? 'AUTO_SUBMITTED' : 'SUBMITTED',
    });

    await logActivity({ user: req.user._id, action: 'QUIZ_ATTEMPTED', entityType: 'QUIZ', entityId: quiz._id, metadata: { score, maxScore }, req });
    res.json(attempt);
  })
);

export default router;
