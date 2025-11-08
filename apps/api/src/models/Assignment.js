import mongoose from 'mongoose';

const RubricCriterionSchema = new mongoose.Schema({
  title: String,
  description: String,
  points: Number,
}, { _id: false });

const PeerReviewSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  reviewersPerSubmission: { type: Number, default: 0 },
  instructions: String,
}, { _id: false });

const SubmissionPolicySchema = new mongoose.Schema({
  maxAttempts: { type: Number, default: 1 },
  lateSubmission: { type: Boolean, default: true },
  latePenalty: Number,
  resubmissionWindowHours: Number,
}, { _id: false });

const AssignmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  title: { type: String, required: true },
  description: String,
  dueAt: Date,
  openAt: Date,
  maxPoints: { type: Number, default: 100 },
  attachments: [String],
  submissionType: { type: String, enum: ['FILE', 'TEXT', 'BOTH'], default: 'BOTH' },
  allowPlagiarismCheck: { type: Boolean, default: false },
  plagiarismProvider: { type: String, enum: ['TURNITIN', 'AI', 'NONE'], default: 'NONE' },
  submissionPolicy: { type: SubmissionPolicySchema, default: () => ({}) },
  rubric: [RubricCriterionSchema],
  peerReview: { type: PeerReviewSchema, default: () => ({}) },
  gradingScale: { type: String, enum: ['POINTS', 'PERCENTAGE', 'LETTER'], default: 'POINTS' },
  secureMode: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Assignment', AssignmentSchema);
