import mongoose from 'mongoose';

const AttemptSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  responses: [{
    questionId: { type: mongoose.Schema.Types.ObjectId },
    response: mongoose.Schema.Types.Mixed,
    score: Number,
  }],
  score: Number,
  maxScore: Number,
  startedAt: Date,
  submittedAt: Date,
  status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'], default: 'SUBMITTED' },
}, { timestamps: true });

AttemptSchema.index({ quiz: 1, student: 1 });

export default mongoose.model('QuizAttempt', AttemptSchema);
