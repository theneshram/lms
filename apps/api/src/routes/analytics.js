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
import VirtualSession from '../models/VirtualSession.js';
import Announcement from '../models/Announcement.js';
import Quiz from '../models/Quiz.js';
import SystemSetting from '../models/SystemSetting.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

function toId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') return value.toString();
  return null;
}

router.get(
  '/dashboard/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const enrollments = await Enrollment.find({ user: userId })
      .populate({
        path: 'course',
        select: 'title description startDate endDate visibility image category level modules metadata',
        options: { lean: true },
      })
      .lean();

    const courseObjectIds = enrollments
      .map((enrollment) => enrollment.course?._id)
      .filter(Boolean);
    const courseIdStrings = courseObjectIds.map((id) => id.toString());
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sessionWindowStart = new Date(now.getTime() - 60 * 60 * 1000);

    const openCourseFilters = { visibility: { $in: ['PUBLIC', 'INVITE_ONLY'] } };
    if (courseObjectIds.length) {
      openCourseFilters._id = { $nin: courseObjectIds };
    }

    const [openCourses, sessions, assignments, announcements, quizzes] = await Promise.all([
      Course.find(openCourseFilters)
        .select('title description startDate endDate visibility image category level modules metadata')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      courseObjectIds.length
        ? VirtualSession.find({
            course: { $in: courseObjectIds },
            startAt: { $gte: sessionWindowStart },
          })
            .select('course title startAt endAt meetingUrl')
            .sort({ startAt: 1 })
            .lean()
        : Promise.resolve([]),
      courseObjectIds.length
        ? Assignment.find({ course: { $in: courseObjectIds } })
            .select('title dueAt course maxPoints')
            .lean()
        : Promise.resolve([]),
      courseObjectIds.length
        ? Announcement.find({ course: { $in: courseObjectIds } })
            .populate({ path: 'course', select: 'title', options: { lean: true } })
            .sort({ createdAt: -1 })
            .limit(12)
            .lean()
        : Promise.resolve([]),
      courseObjectIds.length
        ? Quiz.find({ course: { $in: courseObjectIds } })
            .select('course title questionCount')
            .lean()
        : Promise.resolve([]),
    ]);

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const quizIds = quizzes.map((quiz) => quiz._id);

    const [submissions, attempts] = await Promise.all([
      assignmentIds.length
        ? Submission.find({ assignment: { $in: assignmentIds }, student: userId })
            .select('assignment grade updatedAt')
            .lean()
        : Promise.resolve([]),
      quizIds.length
        ? QuizAttempt.find({ quiz: { $in: quizIds }, student: userId })
            .select('quiz score maxScore submittedAt createdAt')
            .lean()
        : Promise.resolve([]),
    ]);

    const courseTitleMap = new Map();
    enrollments.forEach((enrollment) => {
      const id = toId(enrollment.course?._id);
      if (id) {
        courseTitleMap.set(id, enrollment.course.title);
      }
    });

    const assignmentsByCourse = new Map();
    assignments.forEach((assignment) => {
      const courseId = toId(assignment.course);
      if (!courseId) return;
      const list = assignmentsByCourse.get(courseId) ?? [];
      list.push(assignment);
      assignmentsByCourse.set(courseId, list);
    });

    const submissionsByAssignment = new Map();
    submissions.forEach((submission) => {
      const assignmentId = toId(submission.assignment);
      if (!assignmentId) return;
      const list = submissionsByAssignment.get(assignmentId) ?? [];
      list.push(submission);
      submissionsByAssignment.set(assignmentId, list);
    });

    const quizzesByCourse = new Map();
    quizzes.forEach((quiz) => {
      const courseId = toId(quiz.course);
      if (!courseId) return;
      const list = quizzesByCourse.get(courseId) ?? [];
      list.push(quiz);
      quizzesByCourse.set(courseId, list);
    });

    const attemptsByQuiz = new Map();
    attempts.forEach((attempt) => {
      const quizId = toId(attempt.quiz);
      if (!quizId) return;
      const list = attemptsByQuiz.get(quizId) ?? [];
      list.push(attempt);
      attemptsByQuiz.set(quizId, list);
    });

    const sessionsByCourse = new Map();
    sessions.forEach((session) => {
      const courseId = toId(session.course);
      if (!courseId) return;
      const list = sessionsByCourse.get(courseId) ?? [];
      list.push(session);
      sessionsByCourse.set(courseId, list);
    });

    const progressSummaries = enrollments
      .filter((enrollment) => enrollment.course)
      .map((enrollment) => {
        const courseId = toId(enrollment.course._id);
        const modulesTotal = Array.isArray(enrollment.course.modules) ? enrollment.course.modules.length : 0;
        const metadata = enrollment.metadata ?? {};
        const modulesCompleted = Number(
          metadata.modulesCompleted ?? metadata.modules_completed ?? metadata.completedModules ?? 0
        );
        const explicitProgress = typeof metadata.progress === 'number' ? metadata.progress : null;
        const progressPercent = explicitProgress !== null
          ? Math.max(0, Math.min(100, explicitProgress))
          : modulesTotal > 0
            ? Math.round((modulesCompleted / modulesTotal) * 100)
            : 0;
        const assignmentsForCourse = assignmentsByCourse.get(courseId) ?? [];
        let assignmentsCompleted = 0;
        let assignmentScoreTotal = 0;
        let assignmentScoreCount = 0;
        assignmentsForCourse.forEach((assignment) => {
          const subs = submissionsByAssignment.get(toId(assignment._id)) ?? [];
          if (subs.length) {
            assignmentsCompleted += 1;
            subs.forEach((submission) => {
              if (typeof submission.grade === 'number') {
                assignmentScoreTotal += submission.grade;
                assignmentScoreCount += 1;
              }
            });
          }
        });
        const assignmentAverage = assignmentScoreCount ? assignmentScoreTotal / assignmentScoreCount : null;

        const quizzesForCourse = quizzesByCourse.get(courseId) ?? [];
        let quizzesAttempted = 0;
        let quizScoreTotal = 0;
        let quizScoreCount = 0;
        quizzesForCourse.forEach((quiz) => {
          const quizAttempts = attemptsByQuiz.get(toId(quiz._id)) ?? [];
          if (quizAttempts.length) {
            quizzesAttempted += 1;
            quizAttempts.forEach((attempt) => {
              if (typeof attempt.score === 'number' && typeof attempt.maxScore === 'number' && attempt.maxScore > 0) {
                quizScoreTotal += (attempt.score / attempt.maxScore) * 100;
                quizScoreCount += 1;
              }
            });
          }
        });
        const quizAverage = quizScoreCount ? quizScoreTotal / quizScoreCount : null;

        const dueSoonCount = assignmentsForCourse.filter((assignment) => {
          if (!assignment.dueAt) return false;
          const dueDate = new Date(assignment.dueAt);
          return dueDate >= now && dueDate <= thirtyDaysAhead;
        }).length;

        const upcomingSessionCount = (sessionsByCourse.get(courseId) ?? []).length;

        return {
          courseId,
          courseTitle: enrollment.course.title,
          role: enrollment.role,
          status: enrollment.status,
          progressPercent,
          modulesTotal,
          modulesCompleted,
          assignmentsTotal: assignmentsForCourse.length,
          assignmentsCompleted,
          assignmentAverage,
          quizzesTotal: quizzesForCourse.length,
          quizzesAttempted,
          quizAverage,
          dueSoonCount,
          upcomingSessionCount,
          grade: typeof metadata.grade === 'number' ? metadata.grade : null,
        };
      });

    const upcomingAssignments = assignments
      .filter((assignment) => assignment.dueAt && new Date(assignment.dueAt) >= now)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
      .slice(0, 12)
      .map((assignment) => ({
        ...assignment,
        courseTitle: courseTitleMap.get(toId(assignment.course)),
      }));

    const calendarHighlights = [
      ...sessions.map((session) => ({
        date: session.startAt,
        type: 'SESSION',
        title: session.title,
        courseId: toId(session.course),
        courseTitle: courseTitleMap.get(toId(session.course)),
      })),
      ...upcomingAssignments.map((assignment) => ({
        date: assignment.dueAt,
        type: 'ASSIGNMENT',
        title: assignment.title,
        courseId: toId(assignment.course),
        courseTitle: assignment.courseTitle,
      })),
    ];

    const stats = {
      enrolledCount: enrollments.length,
      completedCount: enrollments.filter((enrollment) => {
        const metadata = enrollment.metadata ?? {};
        if (enrollment.status === 'COMPLETED') return true;
        if (typeof metadata.progress === 'number' && metadata.progress >= 100) return true;
        const modulesTotal = Array.isArray(enrollment.course?.modules) ? enrollment.course.modules.length : 0;
        const modulesCompleted = Number(
          metadata.modulesCompleted ?? metadata.modules_completed ?? metadata.completedModules ?? 0
        );
        return modulesTotal > 0 && modulesCompleted >= modulesTotal;
      }).length,
      upcomingEventCount: sessions.length,
      dueSoonCount: upcomingAssignments.length,
      openCourseCount: openCourses.length,
    };

    const settings = await SystemSetting.getSingleton();
    const demoConfig = settings.demoCourse ?? {};
    let demoCourseDoc = null;
    const demoCourseCode = demoConfig.code || 'DEMO-COURSE';
    if (demoConfig.courseId) {
      demoCourseDoc = await Course.findById(demoConfig.courseId)
        .select('title description startDate endDate modules resources image visibility code')
        .lean();
    }
    if (!demoCourseDoc && demoCourseCode) {
      demoCourseDoc = await Course.findOne({ code: demoCourseCode })
        .select('title description startDate endDate modules resources image visibility code')
        .lean();
    }

    const demoCourseSummary = (() => {
      if (!demoCourseDoc) {
        return {
          code: demoCourseCode,
          autoEnroll: demoConfig.autoEnroll !== false,
          highlight: demoConfig.highlight,
          enrolled: false,
        };
      }
      const demoId = demoCourseDoc._id.toString();
      const enrolled = enrollments.some((enrollment) => enrollment.course?._id?.toString() === demoId);
      const assignmentsForDemo = assignmentsByCourse.get(demoId) ?? [];
      const quizzesForDemo = quizzesByCourse.get(demoId) ?? [];
      const sessionsForDemo = sessionsByCourse.get(demoId) ?? [];
      return {
        courseId: demoCourseDoc._id,
        code: demoCourseDoc.code || demoCourseCode,
        title: demoCourseDoc.title,
        description: demoCourseDoc.description,
        image: demoCourseDoc.image,
        startDate: demoCourseDoc.startDate,
        endDate: demoCourseDoc.endDate,
        modules: Array.isArray(demoCourseDoc.modules) ? demoCourseDoc.modules.length : 0,
        resources: Array.isArray(demoCourseDoc.resources) ? demoCourseDoc.resources.length : 0,
        assignments: assignmentsForDemo.length,
        quizzes: quizzesForDemo.length,
        upcomingSessions: sessionsForDemo.length,
        autoEnroll: demoConfig.autoEnroll !== false,
        highlight: demoConfig.highlight,
        enrolled,
        quizId: demoConfig.quizId,
      };
    })();

    res.json({
      enrollments,
      openCourses,
      upcomingSessions: sessions,
      announcements,
      dueAssignments: upcomingAssignments,
      stats,
      progress: progressSummaries,
      calendarHighlights,
      courseIds: courseIdStrings,
      demoCourse: demoCourseSummary,
    });
  })
);

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
    const { courseId } = req.params;
    const userId = req.user._id;
    const course = await Course.findById(courseId)
      .select('title startDate endDate modules')
      .lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const [enrollment, assignments, quizzes, sessions] = await Promise.all([
      Enrollment.findOne({ course: courseId, user: userId }).lean(),
      Assignment.find({ course: courseId }).select('title dueAt maxPoints').lean(),
      Quiz.find({ course: courseId }).select('title questionCount').lean(),
      VirtualSession.find({
        course: courseId,
        startAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      })
        .select('startAt')
        .lean(),
    ]);

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const quizIds = quizzes.map((quiz) => quiz._id);

    const [submissions, attempts] = await Promise.all([
      assignmentIds.length
        ? Submission.find({ assignment: { $in: assignmentIds }, student: userId })
            .select('assignment grade updatedAt')
            .lean()
        : Promise.resolve([]),
      quizIds.length
        ? QuizAttempt.find({ quiz: { $in: quizIds }, student: userId })
            .select('quiz score maxScore submittedAt')
            .lean()
        : Promise.resolve([]),
    ]);

    const modulesTotal = Array.isArray(course.modules) ? course.modules.length : 0;
    const metadata = enrollment?.metadata ?? {};
    const modulesCompleted = Number(
      metadata.modulesCompleted ?? metadata.modules_completed ?? metadata.completedModules ?? 0
    );
    const explicitProgress = typeof metadata.progress === 'number' ? metadata.progress : null;
    const progressPercent =
      explicitProgress !== null
        ? Math.max(0, Math.min(100, explicitProgress))
        : modulesTotal > 0
        ? Math.round((modulesCompleted / modulesTotal) * 100)
        : 0;
    const grade = typeof metadata.grade === 'number' ? metadata.grade : null;

    const assignmentCompletionSet = new Set();
    let assignmentScoreTotal = 0;
    let assignmentScoreCount = 0;
    submissions.forEach((submission) => {
      const assignmentId = toId(submission.assignment);
      if (!assignmentId) return;
      assignmentCompletionSet.add(assignmentId);
      if (typeof submission.grade === 'number') {
        assignmentScoreTotal += submission.grade;
        assignmentScoreCount += 1;
      }
    });
    const assignmentsCompleted = assignmentCompletionSet.size;
    const assignmentAverage = assignmentScoreCount ? assignmentScoreTotal / assignmentScoreCount : null;

    const quizAttemptedSet = new Set();
    let quizScoreTotal = 0;
    let quizScoreCount = 0;
    attempts.forEach((attempt) => {
      const quizId = toId(attempt.quiz);
      if (!quizId) return;
      quizAttemptedSet.add(quizId);
      if (typeof attempt.score === 'number' && typeof attempt.maxScore === 'number' && attempt.maxScore > 0) {
        quizScoreTotal += (attempt.score / attempt.maxScore) * 100;
        quizScoreCount += 1;
      }
    });
    const quizzesAttempted = quizAttemptedSet.size;
    const quizAverage = quizScoreCount ? quizScoreTotal / quizScoreCount : null;

    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueSoonCount = assignments.filter((assignment) => {
      if (!assignment.dueAt) return false;
      const dueDate = new Date(assignment.dueAt);
      return dueDate >= now && dueDate <= thirtyDaysAhead;
    }).length;

    res.json({
      course,
      summary: {
        modulesTotal,
        modulesCompleted,
        progressPercent,
        grade,
        assignmentsTotal: assignments.length,
        assignmentsCompleted,
        assignmentAverage,
        quizzesTotal: quizzes.length,
        quizzesAttempted,
        quizAverage,
        dueSoonCount,
        upcomingSessionCount: sessions.length,
      },
    });
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
