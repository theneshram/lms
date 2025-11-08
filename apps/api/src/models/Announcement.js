import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  title: String,
  message: String,
  channels: [{ type: String, enum: ['EMAIL', 'SMS', 'IN_APP'] }],
  scheduledAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Announcement', AnnouncementSchema);
