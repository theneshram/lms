import mongoose from 'mongoose';

const EnrollmentRequestSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED'], default: 'PENDING' },
  enrollmentKey: String,
  expiresAt: Date,
  approvalBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentIntentId: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

EnrollmentRequestSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('EnrollmentRequest', EnrollmentRequestSchema);
