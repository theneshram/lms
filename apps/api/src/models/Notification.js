import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: String,
  title: String,
  message: String,
  channel: { type: String, enum: ['EMAIL', 'SMS', 'IN_APP'], default: 'IN_APP' },
  readAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);
