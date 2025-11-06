import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['teacher','ta','student'], required: true }
  },
  { timestamps: true }
);
EnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('Enrollment', EnrollmentSchema);