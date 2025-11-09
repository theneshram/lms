import mongoose from 'mongoose';

const QuizSettingsSchema = new mongoose.Schema({
  durationMinutes: Number,
  maxAttempts: { type: Number, default: 1 },
  negativeMarking: { type: Boolean, default: false },
  negativeMarkValue: { type: Number, default: 0 },
  gradingScale: { type: String, enum: ['POINTS', 'PERCENTAGE'], default: 'POINTS' },
  secureMode: { type: Boolean, default: false },
  autoSubmit: { type: Boolean, default: true },
}, { _id: false });

const QuizQuestionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId },
  override: mongoose.Schema.Types.Mixed,
}, { _id: false });

const QuizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true, required: true },
  module: { type: mongoose.Schema.Types.ObjectId },
  lesson: { type: mongoose.Schema.Types.ObjectId },
  bank: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  graders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String, required: true },
  description: String,
  bank: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank' },
  questions: [QuizQuestionSchema],
  randomize: { type: Boolean, default: false },
  questionCount: Number,
  settings: { type: QuizSettingsSchema, default: () => ({}) },
  published: { type: Boolean, default: false },
  schedule: {
    openAt: Date,
    closeAt: Date,
  },
}, { timestamps: true });

export default mongoose.model('Quiz', QuizSchema);
