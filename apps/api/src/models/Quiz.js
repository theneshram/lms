import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  type: { type: String, enum: ['MCQ','MSQ','TRUE_FALSE','SHORT'], default: 'MCQ' },
  prompt: { type: String, required: true },
  options: [String],
  answer: mongoose.Schema.Types.Mixed,
  points: { type: Number, default: 1 }
});

const QuizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  title: { type: String, required: true },
  durationMinutes: Number,
  questions: [QuestionSchema],
  published: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Quiz', QuizSchema);