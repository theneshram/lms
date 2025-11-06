import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  role: { type: String, enum: ['TEACHER','TA','STUDENT'], default: 'STUDENT' }
}, { timestamps: true });

EnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('Enrollment', EnrollmentSchema);