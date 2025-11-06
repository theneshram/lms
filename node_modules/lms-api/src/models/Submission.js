import mongoose from 'mongoose';

const SubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentUrl: String,
    textAnswer: String,
    score: Number,
    feedback: String
  },
  { timestamps: true }
);
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('Submission', SubmissionSchema);