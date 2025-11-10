import mongoose from 'mongoose';

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'FILL_IN_THE_BLANK',
  'LONG_ANSWER',
  'MATCHING',
  'NUMERIC',
  'FORMULA',
  'IMAGE',
  'AUDIO',
];

const MediaSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['IMAGE', 'AUDIO', 'VIDEO', 'FILE'],
  },
  url: String,
  caption: String,
  altText: String,
  transcription: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { _id: false });

const OptionSchema = new mongoose.Schema({
  key: String,
  label: String,
  value: mongoose.Schema.Types.Mixed,
  media: MediaSchema,
  isCorrect: Boolean,
  feedback: String,
}, { _id: false });

const MatchingPairSchema = new mongoose.Schema({
  prompt: String,
  match: String,
}, { _id: false });

const GradingSchema = new mongoose.Schema({
  maxMarks: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 },
  partialCredit: {
    enabled: { type: Boolean, default: false },
    mode: {
      type: String,
      enum: ['PROPORTIONAL', 'CUSTOM'],
      default: 'PROPORTIONAL',
    },
    rules: mongoose.Schema.Types.Mixed,
  },
  caseSensitive: { type: Boolean, default: false },
  numericTolerance: { type: Number, default: 0 },
}, { _id: false });

const QuestionMetadataSchema = new mongoose.Schema({
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    default: 'MEDIUM',
  },
  subject: String,
  topic: String,
  subTopic: String,
  language: { type: String, default: 'en' },
  tags: [String],
  bloomLevel: String,
  standards: [String],
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  richText: String,
  type: {
    type: String,
    enum: QUESTION_TYPES,
    default: 'MULTIPLE_CHOICE',
  },
  options: { type: [OptionSchema], default: () => [] },
  matchingPairs: { type: [MatchingPairSchema], default: () => [] },
  answer: mongoose.Schema.Types.Mixed,
  answerKey: mongoose.Schema.Types.Mixed,
  explanation: String,
  attachments: { type: [MediaSchema], default: () => [] },
  timeLimitSeconds: Number,
  metadata: { type: QuestionMetadataSchema, default: () => ({}) },
  grading: { type: GradingSchema, default: () => ({}) },
  reviewNotes: String,
  reviewStatus: {
    type: String,
    enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'APPROVED',
  },
  version: { type: Number, default: 1 },
  source: {
    type: String,
    enum: ['AUTHOR', 'IMPORTED', 'AI_GENERATED', 'EXTERNAL'],
    default: 'AUTHOR',
  },
  visibility: {
    type: String,
    enum: ['PRIVATE', 'COURSE', 'GLOBAL'],
    default: 'COURSE',
  },
  linkedLearningObjectives: [String],
}, { timestamps: true });

QuestionSchema.index({ 'metadata.tags': 1 });
QuestionSchema.index({ 'metadata.topic': 1 });
QuestionSchema.index({ type: 1 });

const QuestionBankSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  module: { type: mongoose.Schema.Types.ObjectId },
  lesson: { type: mongoose.Schema.Types.ObjectId },
  title: { type: String, required: true },
  description: String,
  taxonomy: [String],
  defaultDifficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    default: 'MEDIUM',
  },
  storage: {
    type: String,
    enum: ['LOCAL', 'EXTERNAL_API'],
    default: 'LOCAL',
  },
  externalReference: String,
  tags: [String],
  questions: { type: [QuestionSchema], default: () => [] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  visibility: {
    type: String,
    enum: ['PRIVATE', 'COURSE', 'GLOBAL'],
    default: 'COURSE',
  },
  version: { type: Number, default: 1 },
}, { timestamps: true });

QuestionBankSchema.index({ title: 'text', description: 'text' });
QuestionBankSchema.index({ tags: 1 });

export default mongoose.model('QuestionBank', QuestionBankSchema);
