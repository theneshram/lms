import mongoose from 'mongoose';

const QuizQuestionSelectionSchema = new mongoose.Schema({
  questionId: mongoose.Schema.Types.ObjectId,
  criteria: {
    tags: [String],
    difficulty: String,
    type: String,
    includeIds: [mongoose.Schema.Types.ObjectId],
  },
  count: { type: Number, default: 1 },
  weight: Number,
  maxMarks: Number,
  negativeMarks: Number,
  shuffleOptions: { type: Boolean, default: false },
  required: { type: Boolean, default: true },
}, { _id: false });

const QuizSectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  order: { type: Number, default: 0 },
  instructions: String,
  randomize: { type: Boolean, default: false },
  weight: Number,
  questionSelections: { type: [QuizQuestionSelectionSchema], default: () => [] },
}, { _id: false });

const QuizScoringSchema = new mongoose.Schema({
  totalMarks: Number,
  passingType: {
    type: String,
    enum: ['PERCENTAGE', 'POINTS'],
    default: 'PERCENTAGE',
  },
  passingValue: { type: Number, default: 0 },
  attemptLimit: { type: Number, default: 1 },
  allowBackNavigation: { type: Boolean, default: true },
  allowResume: { type: Boolean, default: true },
  autoSubmitOnExpiry: { type: Boolean, default: true },
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  negativeMarking: {
    mode: {
      type: String,
      enum: ['NONE', 'GLOBAL', 'PER_QUESTION'],
      default: 'NONE',
    },
    value: { type: Number, default: 0 },
  },
}, { _id: false });

const QuizAvailabilitySchema = new mongoose.Schema({
  openAt: Date,
  closeAt: Date,
  gracePeriodMinutes: { type: Number, default: 0 },
  timeLimitMinutes: Number,
  perQuestionTimerSeconds: Number,
}, { _id: false });

const QuizAccessSchema = new mongoose.Schema({
  visibility: {
    type: String,
    enum: ['PUBLIC', 'ENROLLED', 'RESTRICTED'],
    default: 'ENROLLED',
  },
  password: String,
  allowedGroups: [mongoose.Schema.Types.ObjectId],
  allowedRoles: [String],
  prerequisiteCourses: [mongoose.Schema.Types.ObjectId],
  prerequisiteLessons: [mongoose.Schema.Types.ObjectId],
  requirePrerequisites: { type: Boolean, default: false },
}, { _id: false });

const QuizFeedbackSchema = new mongoose.Schema({
  releaseMode: {
    type: String,
    enum: ['IMMEDIATE', 'SCHEDULED', 'MANUAL'],
    default: 'MANUAL',
  },
  scheduledAt: Date,
  showCorrectAnswers: { type: Boolean, default: false },
  showExplanations: { type: Boolean, default: false },
  showScoreBreakdown: { type: Boolean, default: true },
}, { _id: false });

const QuizSecuritySchema = new mongoose.Schema({
  enableProctoring: { type: Boolean, default: false },
  fullscreenRequired: { type: Boolean, default: false },
  tabSwitchLimit: { type: Number, default: 0 },
  restrictIpRanges: [String],
  disableCopyPaste: { type: Boolean, default: false },
}, { _id: false });

const QuizReportingSchema = new mongoose.Schema({
  notifyOnStart: { type: Boolean, default: false },
  notifyOnComplete: { type: Boolean, default: false },
  notifyOnPublish: { type: Boolean, default: false },
  analyticsConfig: mongoose.Schema.Types.Mixed,
}, { _id: false });

const QuizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true, required: true },
  module: { type: mongoose.Schema.Types.ObjectId },
  lesson: { type: mongoose.Schema.Types.ObjectId },
  bank: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  graders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String, required: true },
  slug: { type: String },
  description: String,
  instructions: String,
  sections: { type: [QuizSectionSchema], default: () => [] },
  scoring: { type: QuizScoringSchema, default: () => ({}) },
  availability: { type: QuizAvailabilitySchema, default: () => ({}) },
  access: { type: QuizAccessSchema, default: () => ({}) },
  feedback: { type: QuizFeedbackSchema, default: () => ({}) },
  security: { type: QuizSecuritySchema, default: () => ({}) },
  reporting: { type: QuizReportingSchema, default: () => ({}) },
  published: { type: Boolean, default: false },
  reviewStatus: {
    type: String,
    enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'DRAFT',
  },
  metadata: mongoose.Schema.Types.Mixed,
  settings: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

QuizSchema.index({ course: 1, published: 1 });
QuizSchema.index({ slug: 1 }, { unique: true, sparse: true });

export default mongoose.model('Quiz', QuizSchema);
