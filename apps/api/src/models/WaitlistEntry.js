import mongoose from 'mongoose';

const WaitlistEntrySchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  position: Number,
  status: { type: String, enum: ['WAITING', 'NOTIFIED', 'ENROLLED'], default: 'WAITING' },
}, { timestamps: true });

WaitlistEntrySchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('WaitlistEntry', WaitlistEntrySchema);
