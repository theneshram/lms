import mongoose from 'mongoose';

const AttemptSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  responses: [{ questionIndex: Number, response: mongoose.Schema.Types.Mixed }],
  score: Number,
  startedAt: Date,
  submittedAt: Date
}, { timestamps: true });

AttemptSchema.index({ quiz: 1, student: 1 });

export default mongoose.model('QuizAttempt', AttemptSchema);