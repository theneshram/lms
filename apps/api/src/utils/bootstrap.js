import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import Course from '../models/Course.js';
import Assignment from '../models/Assignment.js';
import QuestionBank from '../models/QuestionBank.js';
import Quiz from '../models/Quiz.js';
import Announcement from '../models/Announcement.js';
import VirtualSession from '../models/VirtualSession.js';
import Enrollment from '../models/Enrollment.js';
import Group from '../models/Group.js';
import MessageThread from '../models/MessageThread.js';
import Message from '../models/Message.js';

export async function ensureSuperAdmin(adminConfig = {}) {
  const email = adminConfig.email?.trim();
  const password = adminConfig.password;
  const name = adminConfig.name?.trim() || 'Super Admin';

  if (!email || !password) {
    console.warn('[bootstrap] ADMIN_EMAIL and ADMIN_PASSWORD must be set to auto-provision the super admin.');
    return;
  }

  const existing = await User.findOne({ email }).select('+password');
  if (!existing) {
    await User.create({ name, email, password, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    console.log(`[bootstrap] created super admin account for ${email}`);
    return;
  }

  let updated = false;
  let passwordRefreshed = false;
  if (existing.role !== 'SUPER_ADMIN') {
    existing.role = 'SUPER_ADMIN';
    updated = true;
  }
  if (existing.status !== 'ACTIVE') {
    existing.status = 'ACTIVE';
    updated = true;
  }
  if (existing.name !== name) {
    existing.name = name;
    updated = true;
  }

  if (password) {
    const hasPassword = typeof existing.password === 'string' && existing.password.length > 0;
    let matches = false;
    if (hasPassword) {
      try {
        matches = await existing.compare(password);
      } catch (err) {
        matches = false;
      }
    }

    if (!matches) {
      existing.password = password;
      passwordRefreshed = true;
      updated = true;
    }
  }

  if (updated) {
    await existing.save();
    console.log(
      `[bootstrap] ensured super admin privileges for ${email}${passwordRefreshed ? ' (password refreshed)' : ''}`
    );
  } else {
    console.log(`[bootstrap] super admin already configured for ${email}`);
  }
}

function buildDemoModules() {
  const today = new Date();
  const releaseTomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return [
    {
      title: 'Orientation & theming',
      description: 'Preview the learner experience and experiment with palette switching.',
      order: 1,
      releaseAt: today,
      topics: [
        {
          title: 'Interactive walkthrough',
          order: 1,
          objectives: ['Understand the dashboard layout', 'Locate the admin console toggle'],
          resources: [
            {
              title: 'Product tour (YouTube)',
              type: 'YOUTUBE',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              metadata: { duration: '3:33', format: 'video' },
            },
            {
              title: 'Embed: Figma colour combinations',
              type: 'LINK',
              url: 'https://www.figma.com/resource-library/color-combinations/',
              metadata: { category: 'design' },
            },
          ],
        },
        {
          title: 'Customize your branding',
          order: 2,
          objectives: ['Swap logos and typography', 'Schedule theme releases'],
          resources: [
            {
              title: 'Brand kit checklist',
              type: 'LINK',
              url: 'https://example.com/lms/brand-kit',
              metadata: { downloadable: true },
            },
          ],
        },
      ],
    },
    {
      title: 'Engage & assess learners',
      description: 'Assignments, quizzes, live sessions, and chat in action.',
      order: 2,
      releaseAt: releaseTomorrow,
      topics: [
        {
          title: 'Assignments & rubrics',
          order: 1,
          objectives: ['Create a rubric-based assignment', 'Configure late submission policies'],
          resources: [
            {
              title: 'Rubric template',
              type: 'FILE',
              url: 'https://example.com/files/rubric-template.pdf',
              metadata: { kind: 'pdf' },
            },
          ],
        },
        {
          title: 'Proctored quizzes & analytics',
          order: 2,
          objectives: ['Randomize question pools', 'Review quiz insights'],
          resources: [
            {
              title: 'Quiz blueprint sample',
              type: 'LINK',
              url: 'https://example.com/lms/quiz-blueprint',
            },
          ],
        },
      ],
    },
  ];
}

function buildDemoResources() {
  return [
    {
      title: 'Facilitator handbook',
      type: 'LINK',
      url: 'https://example.com/lms/facilitator-handbook',
      tags: ['facilitator', 'guide'],
      metadata: { description: 'Step-by-step facilitator runbook.' },
    },
    {
      title: 'SCORM compliance checklist',
      type: 'LINK',
      url: 'https://example.com/lms/scorm-checklist',
      tags: ['compliance'],
      metadata: { format: 'article' },
    },
    {
      title: 'Sample onboarding video',
      type: 'VIDEO',
      url: 'https://videos.example.com/onboarding-demo.mp4',
      tags: ['video'],
      metadata: { duration: '6:12' },
    },
  ];
}

function buildDemoQuestions() {
  return [
    {
      prompt: 'Which feature lets you auto-enroll learners into programmes?',
      type: 'MULTIPLE_CHOICE',
      options: [
        { key: 'A', label: 'Enrollment keys', isCorrect: true },
        { key: 'B', label: 'Branding palettes', isCorrect: false },
        { key: 'C', label: 'SMTP templates', isCorrect: false },
      ],
      answer: 'A',
      explanation: 'Enrollment keys and automated rules control bulk enrolments.',
      metadata: { difficulty: 'EASY', tags: ['enrollment', 'core'] },
      grading: { maxMarks: 2, negativeMarks: 0, partialCredit: { enabled: false } },
    },
    {
      prompt: 'True or false: Secure quiz mode can block tab switching and copy/paste.',
      type: 'TRUE_FALSE',
      answer: true,
      explanation: 'Enabling secure mode enforces browser focus and disables clipboard actions.',
      metadata: { difficulty: 'EASY', tags: ['quizzes', 'security'] },
      grading: { maxMarks: 1, negativeMarks: 0 },
    },
    {
      prompt: 'List one insight you can pull from the course analytics dashboard.',
      type: 'SHORT_ANSWER',
      answerKey: ['Completion rate', 'Drop-off points', 'Engagement heatmap'],
      explanation: 'Analytics provide completion rates, time spent, inactivity, and more.',
      metadata: { difficulty: 'MEDIUM', tags: ['analytics'] },
      grading: { maxMarks: 3, negativeMarks: 0, partialCredit: { enabled: true, mode: 'PROPORTIONAL' } },
    },
    {
      prompt: 'Match the feature to its outcome.',
      type: 'MATCHING',
      matchingPairs: [
        { prompt: 'Announcements', match: 'Broadcast course updates' },
        { prompt: 'Virtual sessions', match: 'Host live classes' },
        { prompt: 'Certificates', match: 'Issue completion proof' },
      ],
      explanation: 'Communication, live delivery, and recognition each live in distinct modules.',
      metadata: { difficulty: 'MEDIUM', tags: ['communication'] },
      grading: { maxMarks: 3, partialCredit: { enabled: true, mode: 'PROPORTIONAL' } },
    },
    {
      prompt: 'How many points does a learner need to pass if the quiz total is 20 and the passing percentage is 70%?',
      type: 'NUMERIC',
      answer: 14,
      explanation: '70% of 20 equals 14 points.',
      metadata: { difficulty: 'EASY', tags: ['grading', 'maths'] },
      grading: { maxMarks: 2, numericTolerance: 0.5 },
    },
  ];
}

export async function ensureDemoCourse() {
  const settings = await SystemSetting.getSingleton();
  const demoConfig = settings.demoCourse ?? {};
  const courseCode = demoConfig.code || 'DEMO-COURSE';

  const facilitator = await User.findOne({ role: { $in: ['TEACHER', 'ADMIN', 'SUPER_ADMIN'] } }).sort({ createdAt: 1 });
  if (!facilitator) {
    console.warn('[bootstrap] Unable to seed demo course because no facilitator-level user exists yet.');
    return;
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  const modules = buildDemoModules();
  const resources = buildDemoResources();

  let course = await Course.findOne({ code: courseCode });
  if (!course) {
    course = await Course.create({
      code: courseCode,
      title: 'LMS Experience Tour',
      description:
        'A guided sandbox with announcements, assignments, quizzes, live sessions, chat, and analytics so you can experience every module before launching to learners.',
      image: 'https://images.example.com/course/experience-tour.jpg',
      startDate,
      endDate,
      durationWeeks: 4,
      category: 'Enablement',
      subject: 'Platform Onboarding',
      level: 'BEGINNER',
      department: 'Enablement',
      tags: ['demo', 'onboarding', 'walkthrough'],
      createdBy: facilitator._id,
      teachingAssistants: [],
      visibility: 'PUBLIC',
      enrollmentLimit: undefined,
      allowSelfEnrollment: true,
      modules,
      resources,
      metadata: { mode: 'COURSE', path: 'demo' },
      welcomeMessage:
        'Welcome to the LMS experience tour! Work through the orientation, post a message in the lounge, and try the readiness check quiz to see reporting in action.',
    });
  } else {
    course.title = 'LMS Experience Tour';
    course.description =
      'A guided sandbox with announcements, assignments, quizzes, live sessions, chat, and analytics so you can experience every module before launching to learners.';
    course.startDate = startDate;
    course.endDate = endDate;
    course.level = 'BEGINNER';
    course.visibility = 'PUBLIC';
    course.allowSelfEnrollment = true;
    course.modules = modules;
    course.resources = resources;
    course.metadata = { ...(course.metadata || {}), mode: 'COURSE', path: 'demo' };
    course.welcomeMessage =
      'Welcome to the LMS experience tour! Work through the orientation, post a message in the lounge, and try the readiness check quiz to see reporting in action.';
    if (!course.createdBy) course.createdBy = facilitator._id;
    await course.save();
  }

  await Enrollment.findOneAndUpdate(
    { course: course._id, user: facilitator._id },
    { course: course._id, user: facilitator._id, role: 'TEACHER', status: 'ACTIVE', enrollmentSource: 'API' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const dueAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  await Assignment.findOneAndUpdate(
    { course: course._id, title: 'Orientation reflection' },
    {
      course: course._id,
      title: 'Orientation reflection',
      description:
        'Upload a short note or record a video summarising how you plan to use the LMS in your programmes. The rubric highlights what good reflections include.',
      dueAt,
      openAt: startDate,
      maxPoints: 100,
      submissionType: 'BOTH',
      allowPlagiarismCheck: true,
      plagiarismProvider: 'AI',
      submissionPolicy: {
        maxAttempts: 2,
        lateSubmission: true,
        latePenalty: 10,
        resubmissionWindowHours: 24,
      },
      rubric: [
        { title: 'Clarity of goals', description: 'States what success looks like for their rollout.', points: 40 },
        { title: 'Adoption plan', description: 'Mentions stakeholders and communication plan.', points: 40 },
        { title: 'Reflection', description: 'Shares concerns or support required.', points: 20 },
      ],
      peerReview: { enabled: true, reviewersPerSubmission: 1, instructions: 'Leave encouragement and one suggestion.' },
      gradingScale: 'POINTS',
      secureMode: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let bank = await QuestionBank.findOne({ course: course._id, title: 'Demo question bank' });
  if (!bank) {
    bank = new QuestionBank({
      course: course._id,
      title: 'Demo question bank',
      description: 'Reusable items showcasing objective and subjective question types.',
      tags: ['demo', 'readiness'],
      owner: facilitator._id,
    });
  }
  bank.questions = buildDemoQuestions();
  bank.version = (bank.version || 0) + 1;
  bank.markModified('questions');
  await bank.save();

  const selections = (bank.questions || []).map((question) => ({
    questionId: question._id,
    count: 1,
    maxMarks: question.grading?.maxMarks ?? 2,
    negativeMarks: question.grading?.negativeMarks ?? 0,
    shuffleOptions: ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'MATCHING'].includes(question.type),
    required: true,
  }));
  const totalMarks = selections.reduce((acc, current) => acc + (current.maxMarks || 0), 0);

  const quizDoc = await Quiz.findOneAndUpdate(
    { course: course._id, slug: 'demo-readiness-check' },
    {
      course: course._id,
      bank: bank._id,
      owner: facilitator._id,
      graders: [facilitator._id],
      title: 'Experience tour readiness check',
      slug: 'demo-readiness-check',
      description: 'Five-question quiz that demonstrates question pools, timers, proctoring, and analytics.',
      instructions: 'You have 30 minutes. Switching tabs triggers secure-mode alerts.',
      sections: [
        {
          title: 'Core concepts',
          description: 'Mix of objective and subjective question types.',
          order: 1,
          instructions: 'Answer all questions to see the results analysis.',
          randomize: true,
          questionSelections: selections,
        },
      ],
      scoring: {
        totalMarks: totalMarks || 10,
        passingType: 'PERCENTAGE',
        passingValue: 70,
        attemptLimit: 3,
        allowBackNavigation: false,
        allowResume: true,
        autoSubmitOnExpiry: true,
        shuffleQuestions: true,
        shuffleOptions: true,
        negativeMarking: { mode: 'GLOBAL', value: 0 },
      },
      availability: {
        openAt: startDate,
        closeAt: endDate,
        gracePeriodMinutes: 5,
        timeLimitMinutes: 30,
      },
      access: {
        visibility: 'ENROLLED',
        password: undefined,
        allowedRoles: ['STUDENT'],
        requirePrerequisites: false,
      },
      feedback: {
        releaseMode: 'IMMEDIATE',
        showCorrectAnswers: true,
        showExplanations: true,
        showScoreBreakdown: true,
      },
      security: {
        enableProctoring: true,
        fullscreenRequired: true,
        tabSwitchLimit: 3,
        disableCopyPaste: true,
      },
      reporting: { notifyOnStart: true, notifyOnComplete: true, notifyOnPublish: true },
      published: true,
      reviewStatus: 'APPROVED',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Announcement.findOneAndUpdate(
    { course: course._id, title: 'Welcome to the experience tour' },
    {
      course: course._id,
      title: 'Welcome to the experience tour',
      message:
        'Explore the modules in order, then introduce yourself in the lounge. Set notification preferences to try the reminder workflow. Everything here is editable so you can model your own academy.',
      channels: ['IN_APP', 'EMAIL'],
      scheduledAt: startDate,
      createdBy: facilitator._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const sessionStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000);
  await VirtualSession.findOneAndUpdate(
    { course: course._id, title: 'Live tour & Q&A' },
    {
      course: course._id,
      provider: 'TEAMS',
      title: 'Live tour & Q&A',
      description: 'Bring your stakeholders and ask questions about integrations, theming, and rollout.',
      meetingUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting-demo-course',
      recordingUrl: 'https://example.com/recordings/demo-course-qna',
      startAt: sessionStart,
      endAt: sessionEnd,
      notifications: {
        enabled: true,
        includeStartReminder: true,
        includeEndSummary: true,
        channels: ['EMAIL', 'IN_APP'],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let group = await Group.findOne({ code: `${courseCode}-COMMUNITY` });
  if (!group) {
    group = await Group.create({
      name: 'Demo course lounge',
      code: `${courseCode}-COMMUNITY`,
      type: 'CLASS',
      owner: facilitator._id,
      course: course._id,
      members: [facilitator._id],
      metadata: { system: 'demo' },
    });
  } else {
    group.owner = group.owner || facilitator._id;
    group.course = course._id;
    group.metadata = { ...(group.metadata || {}), system: 'demo' };
    if (!group.members?.some((member) => member?.toString() === facilitator._id.toString())) {
      group.members = [...(group.members || []), facilitator._id];
    }
    await group.save();
  }

  let thread = await MessageThread.findOne({ title: 'Demo course lounge', type: 'GROUP' });
  if (!thread) {
    thread = await MessageThread.create({
      title: 'Demo course lounge',
      type: 'GROUP',
      participants: [{ user: facilitator._id, role: 'OWNER' }],
    });
  }

  const welcomeMessageExists = await Message.findOne({ thread: thread._id });
  if (!welcomeMessageExists) {
    await Message.create({
      thread: thread._id,
      sender: facilitator._id,
      content:
        '👋 Welcome! Drop a note to test reactions, replies, and moderation workflows. This lounge mirrors the real-time chat learners will see.',
      type: 'TEXT',
    });
  }

  settings.demoCourse = {
    code: courseCode,
    courseId: course._id,
    autoEnroll: demoConfig.autoEnroll !== false,
    highlight:
      demoConfig.highlight ||
      'All new users are auto-enrolled so they can try assignments, quizzes, announcements, live sessions, and chat immediately.',
    quizId: quizDoc?._id,
    lastRefreshedAt: new Date(),
  };

  if (!settings.storage) {
    settings.storage = { provider: 'LOCAL', uploadLimits: { maxFileSizeMb: 512, totalQuotaGb: 20, allowVideos: true, allowDocuments: true, allowImages: true, allowScorm: true } };
  }

  await settings.save();
}

export async function autoEnrollDemoCourse(user) {
  if (!user) return null;
  const settings = await SystemSetting.getSingleton();
  const demoConfig = settings.demoCourse ?? {};
  if (demoConfig.autoEnroll === false) return null;
  const code = demoConfig.code || 'DEMO-COURSE';
  const course = await Course.findOne({ code });
  if (!course) return null;
  await Enrollment.findOneAndUpdate(
    { course: course._id, user: user._id },
    { course: course._id, user: user._id, status: 'ACTIVE', role: 'STUDENT', enrollmentSource: 'API' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return course;
}
