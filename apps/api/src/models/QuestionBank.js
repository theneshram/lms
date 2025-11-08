import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  type: { type: String, enum: ['MCQ', 'MSQ', 'TRUE_FALSE', 'ESSAY', 'FILL_BLANK', 'SHORT'], default: 'MCQ' },
  options: [String],
  answer: mongoose.Schema.Types.Mixed,
  explanation: String,
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
  tags: [String],
  negativeMarks: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 1 },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const QuestionBankSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  title: String,
  questions: [QuestionSchema],
}, { timestamps: true });

export default mongoose.model('QuestionBank', QuestionBankSchema);
