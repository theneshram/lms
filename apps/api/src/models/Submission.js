import mongoose from 'mongoose';

const PeerFeedbackSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: Number,
  comments: String,
}, { _id: false });

const PlagiarismSchema = new mongoose.Schema({
  score: Number,
  reportUrl: String,
  provider: String,
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  attempt: { type: Number, default: 1 },
  files: [String],
  text: String,
  grade: Number,
  feedback: String,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rubricScores: mongoose.Schema.Types.Mixed,
  peerFeedback: [PeerFeedbackSchema],
  plagiarism: PlagiarismSchema,
}, { timestamps: true });

SubmissionSchema.index({ assignment: 1, student: 1, attempt: 1 }, { unique: true });

export default mongoose.model('Submission', SubmissionSchema);
