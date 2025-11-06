import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  files: [String],
  text: String,
  grade: Number,
  feedback: String,
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('Submission', SubmissionSchema);