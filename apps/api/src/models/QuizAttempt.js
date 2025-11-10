import mongoose from 'mongoose';

const AttemptQuestionSchema = new mongoose.Schema({
  sectionId: mongoose.Schema.Types.ObjectId,
  questionId: mongoose.Schema.Types.ObjectId,
  prompt: String,
  type: String,
  options: mongoose.Schema.Types.Mixed,
  answerKey: mongoose.Schema.Types.Mixed,
  maxMarks: Number,
  negativeMarks: Number,
  partialCredit: mongoose.Schema.Types.Mixed,
  explanation: String,
  response: mongoose.Schema.Types.Mixed,
  autoScore: { type: Number, default: 0 },
  manualScore: { type: Number, default: 0 },
  requiresManual: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['UNANSWERED', 'ANSWERED', 'REVIEW_PENDING', 'GRADED'],
    default: 'UNANSWERED',
  },
  feedback: String,
  timeSpentSeconds: { type: Number, default: 0 },
  flags: { type: [String], default: () => [] },
}, { _id: false });

const AttemptSectionSchema = new mongoose.Schema({
  sectionId: mongoose.Schema.Types.ObjectId,
  title: String,
  order: Number,
  weight: Number,
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
}, { _id: false });

const ProctoringSchema = new mongoose.Schema({
  tabSwitchCount: { type: Number, default: 0 },
  fullscreenBreaches: { type: Number, default: 0 },
  flaggedEvents: { type: [mongoose.Schema.Types.Mixed], default: () => [] },
}, { _id: false });

const AttemptSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  questionBlueprint: { type: [AttemptQuestionSchema], default: () => [] },
  sections: { type: [AttemptSectionSchema], default: () => [] },
  responses: [{
    questionId: mongoose.Schema.Types.ObjectId,
    value: mongoose.Schema.Types.Mixed,
    answeredAt: Date,
  }],
  score: { type: Number, default: 0 },
  autoScore: { type: Number, default: 0 },
  manualScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  percentage: Number,
  startedAt: Date,
  submittedAt: Date,
  timeSpentSeconds: Number,
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'NEEDS_REVIEW', 'GRADED', 'RELEASED'],
    default: 'IN_PROGRESS',
  },
  release: {
    published: { type: Boolean, default: false },
    releasedAt: Date,
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  ipAddress: String,
  userAgent: String,
  device: mongoose.Schema.Types.Mixed,
  autosavedAt: Date,
  proctoring: { type: ProctoringSchema, default: () => ({}) },
  remarks: String,
  auditTrail: { type: [mongoose.Schema.Types.Mixed], default: () => [] },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

AttemptSchema.index({ quiz: 1, student: 1 });
AttemptSchema.index({ status: 1 });

export default mongoose.model('QuizAttempt', AttemptSchema);
