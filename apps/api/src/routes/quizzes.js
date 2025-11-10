import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import QuestionBank from '../models/QuestionBank.js';
import Enrollment from '../models/Enrollment.js';
import { asyncHandler } from '../utils/error.js';
import { logActivity } from '../utils/activity.js';
import {
  buildAttemptBlueprint,
  gradeAttempt,
  ensurePrerequisitesMet,
  canGradeAttempt,
  canViewAttempt,
  summarizeAttempts,
} from '../utils/quiz.js';

const router = Router();

async function loadQuiz(req, res, next) {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  req.quiz = quiz;
  return next();
}

function isManageAllowed(quiz, user) {
  if (!user) return false;
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return true;
  if (user.role === 'TEACHER' && quiz.owner?.equals(user._id)) return true;
  return false;
}

function isWithinAvailability(quiz) {
  const { availability } = quiz;
  if (!availability) return true;
  const now = new Date();
  if (availability.openAt && now < availability.openAt) return false;
  if (availability.closeAt && now > availability.closeAt) return false;
  return true;
}

async function isAccessibleToUser(quiz, user) {
  if (!user) return false;
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return true;
  if (user.role !== 'STUDENT') return true;

  if (!quiz.published) return false;
  if (!isWithinAvailability(quiz)) return false;

  const { access } = quiz;
  if (!access || access.visibility === 'PUBLIC') {
    return true;
  }

  if (access.visibility === 'ENROLLED') {
    const enrollment = await Enrollment.findOne({
      user: user._id,
      course: quiz.course,
      status: { $in: ['ACTIVE', 'COMPLETED'] },
    }).lean();
    return Boolean(enrollment);
  }

  if (access.visibility === 'RESTRICTED') {
    if (access.allowedRoles?.length && access.allowedRoles.includes(user.role)) {
      return true;
    }
    if (access.allowedGroups?.length && user.groups?.length) {
      const userGroupIds = new Set(user.groups.map((groupId) => String(groupId)));
      if (access.allowedGroups.some((groupId) => userGroupIds.has(String(groupId)))) {
        return true;
      }
    }
    return false;
  }

  return false;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim().replace(/^"|"$/g, ''));
}

function parseCsvQuestions(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => {
    const values = parseCsvLine(line);
    const row = headers.reduce((acc, header, index) => ({ ...acc, [header]: values[index] ?? '' }), {});
    return {
      prompt: row.prompt,
      type: row.type || 'MULTIPLE_CHOICE',
      options: row.options ? row.options.split('|').map((label, index) => ({ key: String(index + 1), label })) : [],
      answer: row.answer || row.answerKey,
      answerKey: row.answerKey || row.answer,
      explanation: row.explanation,
      metadata: {
        difficulty: row.difficulty,
        subject: row.subject,
        topic: row.topic,
        tags: row.tags ? row.tags.split('|') : [],
      },
      grading: {
        maxMarks: row.maxMarks ? Number(row.maxMarks) : undefined,
        negativeMarks: row.negativeMarks ? Number(row.negativeMarks) : undefined,
      },
    };
  });
}

function stringifyCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (/[,"\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  const csvLines = [headers.join(',')];
  rows.forEach((row) => {
    csvLines.push(headers.map((header) => escape(row[header])).join(','));
  });
  return csvLines.join('\n');
}

router.get(
  '/banks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.course) filters.course = req.query.course;
    if (req.query.tag) filters.tags = req.query.tag;
    if (req.query.visibility) filters.visibility = req.query.visibility;
    const banks = await QuestionBank.find(filters).lean();
    res.json(banks);
  })
);

router.post(
  '/banks',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.create({ ...req.body, owner: req.user._id });
    res.status(201).json(bank);
  })
);

router.get(
  '/banks/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });
    return res.json(bank);
  })
);

router.put(
  '/banks/:id',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });
    return res.json(bank);
  })
);

router.get(
  '/banks/:id/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });

    let questions = bank.questions;
    if (req.query.tag) {
      questions = questions.filter((question) => question.metadata?.tags?.includes(req.query.tag));
    }
    if (req.query.type) {
      questions = questions.filter((question) => question.type === req.query.type);
    }
    if (req.query.difficulty) {
      questions = questions.filter((question) => question.metadata?.difficulty === req.query.difficulty);
    }

    res.json(questions);
  })
);

router.post(
  '/banks/:id/questions',
  requireAuth,
  requireRole('ADMIN', 'TEACHER', 'TA'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });

    const questionPayload = Array.isArray(req.body) ? req.body : [req.body];
    const created = [];
    questionPayload.forEach((payload) => {
      const question = bank.questions.create({
        ...payload,
        reviewStatus: req.user.role === 'TA' ? 'PENDING_REVIEW' : payload.reviewStatus,
        source: payload.source || (req.user.role === 'TA' ? 'AUTHOR' : payload.source),
      });
      bank.questions.push(question);
      created.push(question);
    });
    bank.markModified('questions');
    await bank.save();
    res.status(201).json(created.length === 1 ? created[0] : created);
  })
);

router.put(
  '/banks/:id/questions/:questionId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });
    const question = bank.questions.id(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    Object.assign(question, req.body);
    bank.markModified('questions');
    await bank.save();
    res.json(question);
  })
);

router.delete(
  '/banks/:id/questions/:questionId',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });
    const question = bank.questions.id(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    question.deleteOne();
    bank.markModified('questions');
    await bank.save();
    res.status(204).end();
  })
);

router.post(
  '/banks/:id/questions/import',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });

    const { csv, questions } = req.body;
    let payload = questions;
    if (csv) {
      payload = parseCsvQuestions(csv);
    }
    if (!Array.isArray(payload) || !payload.length) {
      return res.status(400).json({ message: 'No questions supplied' });
    }

    payload.forEach((question) => {
      bank.questions.push(question);
    });
    bank.markModified('questions');
    await bank.save();
    res.status(201).json({ imported: payload.length });
  })
);

router.get(
  '/banks/:id/export',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Question bank not found' });
    const format = (req.query.format || 'json').toLowerCase();
    if (format === 'csv') {
      const rows = bank.questions.map((question) => ({
        prompt: question.prompt,
        type: question.type,
        options: question.options?.map((opt) => opt.label).join('|'),
        answer: question.answer,
        answerKey: question.answerKey,
        explanation: question.explanation,
        difficulty: question.metadata?.difficulty,
        subject: question.metadata?.subject,
        topic: question.metadata?.topic,
        tags: question.metadata?.tags?.join('|'),
        maxMarks: question.grading?.maxMarks,
        negativeMarks: question.grading?.negativeMarks,
      }));
      const csv = stringifyCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="question-bank.csv"');
      return res.send(csv);
    }
    return res.json(bank.questions);
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.create({ ...req.body, owner: req.user._id });
    await logActivity({
      user: req.user._id,
      action: 'QUIZ_CREATED',
      entityType: 'QUIZ',
      entityId: quiz._id,
      metadata: req.body,
      req,
    });
    res.status(201).json(quiz);
  })
);

router.put(
  '/:id',
  requireAuth,
  loadQuiz,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    if (!isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    Object.assign(req.quiz, req.body);
    await req.quiz.save();
    res.json(req.quiz);
  })
);

router.post(
  '/:id/graders',
  requireAuth,
  loadQuiz,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    if (!isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const graderIds = (req.body.graders || []).map((id) => new mongoose.Types.ObjectId(id));
    req.quiz.graders = graderIds;
    await req.quiz.save();
    res.json(req.quiz);
  })
);

router.post(
  '/:id/publish',
  requireAuth,
  loadQuiz,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    if (!isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.quiz.published = true;
    req.quiz.reviewStatus = 'APPROVED';
    await req.quiz.save();
    res.json(req.quiz);
  })
);

router.post(
  '/:id/unpublish',
  requireAuth,
  loadQuiz,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    if (!isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.quiz.published = false;
    await req.quiz.save();
    res.json(req.quiz);
  })
);

router.get(
  '/course/:courseId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = { course: req.params.courseId };
    if (req.user.role === 'STUDENT') {
      filters.published = true;
    }
    const quizzes = await Quiz.find(filters).lean();
    const visible = [];
    for (const quiz of quizzes) {
      if (await isAccessibleToUser(quiz, req.user)) {
        visible.push(quiz);
      }
    }
    res.json(visible);
  })
);

router.get(
  '/:id',
  requireAuth,
  loadQuiz,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'STUDENT' && !(await isAccessibleToUser(req.quiz, req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(req.quiz);
  })
);

router.get(
  '/:id/my-attempts',
  requireAuth,
  loadQuiz,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'STUDENT' && !(await isAccessibleToUser(req.quiz, req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const attempts = await QuizAttempt.find({ quiz: req.quiz._id, student: req.user._id });
    res.json(attempts);
  })
);

router.post(
  '/:id/start',
  requireAuth,
  loadQuiz,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const quiz = req.quiz;
    if (!quiz.published) return res.status(403).json({ message: 'Quiz is not published' });
    if (!(await isAccessibleToUser(quiz, req.user))) return res.status(403).json({ message: 'Quiz not accessible' });
    if (!isWithinAvailability(quiz)) return res.status(403).json({ message: 'Quiz not currently open' });
    if (!(await ensurePrerequisitesMet(quiz, req.user._id))) {
      return res.status(403).json({ message: 'Prerequisites not satisfied' });
    }
    if (quiz.access?.password && quiz.access.password !== req.body.password) {
      return res.status(403).json({ message: 'Incorrect quiz password' });
    }

    const attemptLimit = quiz.scoring?.attemptLimit;
    if (attemptLimit && attemptLimit > 0) {
      const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id, student: req.user._id });
      if (attemptCount >= attemptLimit) {
        return res.status(400).json({ message: 'Maximum attempts reached' });
      }
    }

    const existing = await QuizAttempt.findOne({ quiz: quiz._id, student: req.user._id, status: 'IN_PROGRESS' });
    if (existing && quiz.scoring?.allowResume !== false) {
      return res.json(existing);
    }

    const { sections, questionBlueprint } = await buildAttemptBlueprint(quiz);
    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user._id,
      sections,
      questionBlueprint,
      startedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      device: req.body.device,
    });

    await logActivity({
      user: req.user._id,
      action: 'QUIZ_ATTEMPT_STARTED',
      entityType: 'QUIZ',
      entityId: quiz._id,
      metadata: { attemptId: attempt._id },
      req,
    });

    res.status(201).json(attempt);
  })
);

router.post(
  '/attempts/:attemptId/autosave',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (!attempt.student.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Attempt is not active' });
    }
    attempt.responses = req.body.responses || attempt.responses;
    if (req.body.proctoring) {
      attempt.proctoring = { ...attempt.proctoring, ...req.body.proctoring };
    }
    attempt.autosavedAt = new Date();
    await attempt.save();
    res.json({ autosavedAt: attempt.autosavedAt });
  })
);

router.post(
  '/attempts/:attemptId/submit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!attempt.student.equals(req.user._id) && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Attempt is already submitted' });
    }

    attempt.responses = req.body.responses || attempt.responses;
    const graded = gradeAttempt(attempt.questionBlueprint, attempt, quiz);

    attempt.questionBlueprint = graded.gradedQuestions;
    attempt.autoScore = graded.autoScore;
    attempt.manualScore = graded.manualScore;
    attempt.maxScore = graded.maxScore;
    attempt.score = graded.totalScore;
    attempt.percentage = graded.percentage;
    attempt.status = graded.requiresManualReview ? 'NEEDS_REVIEW' : 'GRADED';
    attempt.submittedAt = new Date();
    attempt.timeSpentSeconds = attempt.startedAt ? Math.round((attempt.submittedAt - attempt.startedAt) / 1000) : undefined;

    if (req.body.autoSubmitted) {
      attempt.status = 'AUTO_SUBMITTED';
    }

    if (!graded.requiresManualReview && quiz.feedback?.releaseMode === 'IMMEDIATE') {
      attempt.release = {
        published: true,
        releasedAt: new Date(),
        releasedBy: req.user._id,
      };
      attempt.status = 'RELEASED';
    }

    await attempt.save();

    await logActivity({
      user: req.user._id,
      action: 'QUIZ_ATTEMPT_SUBMITTED',
      entityType: 'QUIZ',
      entityId: quiz._id,
      metadata: { attemptId: attempt._id, score: attempt.score, percentage: attempt.percentage },
      req,
    });

    res.json(attempt);
  })
);

router.post(
  '/attempts/:attemptId/manual-grade',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attempt = await QuizAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!canGradeAttempt(quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updates = req.body.questions || [];
    const questionMap = new Map(attempt.questionBlueprint.map((question) => [String(question.questionId), question]));

    updates.forEach((update) => {
      const question = questionMap.get(String(update.questionId));
      if (!question) return;
      if (typeof update.manualScore === 'number') {
        question.manualScore = Math.max(0, Math.min(question.maxMarks ?? 1, update.manualScore));
      }
      if (update.feedback !== undefined) {
        question.feedback = update.feedback;
      }
      question.status = 'GRADED';
    });

    attempt.questionBlueprint = Array.from(questionMap.values());
    attempt.manualScore = attempt.questionBlueprint.reduce((sum, question) => sum + (question.manualScore || 0), 0);
    attempt.autoScore = attempt.questionBlueprint.reduce((sum, question) => sum + (question.autoScore || 0), 0);
    attempt.maxScore = attempt.questionBlueprint.reduce((sum, question) => sum + (question.maxMarks || 0), 0);
    attempt.score = attempt.autoScore + attempt.manualScore;
    attempt.percentage = attempt.maxScore ? (attempt.score / attempt.maxScore) * 100 : 0;
    attempt.status = req.body.publish ? 'RELEASED' : 'GRADED';

    if (req.body.publish) {
      attempt.release = {
        published: true,
        releasedAt: new Date(),
        releasedBy: req.user._id,
      };
    }

    await attempt.save();

    await logActivity({
      user: req.user._id,
      action: 'QUIZ_ATTEMPT_GRADED',
      entityType: 'QUIZ',
      entityId: quiz._id,
      metadata: { attemptId: attempt._id, score: attempt.score },
      req,
    });

    res.json(attempt);
  })
);

router.get(
  '/:id/attempts',
  requireAuth,
  loadQuiz,
  asyncHandler(async (req, res) => {
    if (!canGradeAttempt(req.quiz, req.user) && !isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const attempts = await QuizAttempt.find({ quiz: req.quiz._id })
      .populate('student', 'name email role')
      .lean();
    res.json(attempts);
  })
);

router.get(
  '/attempts/:attemptId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attempt = await QuizAttempt.findById(req.params.attemptId).populate('quiz');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const quiz = attempt.quiz instanceof Quiz ? attempt.quiz : await Quiz.findById(attempt.quiz);
    if (!canViewAttempt(quiz, attempt, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(attempt);
  })
);

router.post(
  '/:id/results/release',
  requireAuth,
  loadQuiz,
  requireRole('ADMIN', 'TEACHER'),
  asyncHandler(async (req, res) => {
    if (!isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const now = new Date();
    const result = await QuizAttempt.updateMany(
      { quiz: req.quiz._id, 'release.published': { $ne: true } },
      {
        $set: {
          'release.published': true,
          'release.releasedAt': now,
          'release.releasedBy': req.user._id,
          status: 'RELEASED',
        },
      }
    );
    res.json({ released: result.modifiedCount });
  })
);

router.get(
  '/:id/analytics',
  requireAuth,
  loadQuiz,
  asyncHandler(async (req, res) => {
    if (!canGradeAttempt(req.quiz, req.user) && !isManageAllowed(req.quiz, req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const attempts = await QuizAttempt.find({ quiz: req.quiz._id }).lean();
    const summary = summarizeAttempts(attempts);
    res.json(summary);
  })
);

export default router;
