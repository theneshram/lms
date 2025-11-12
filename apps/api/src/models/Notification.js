import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: String,
    title: String,
    message: String,
    subject: String,
    html: String,
    templateKey: String,
    channel: { type: String, enum: ['EMAIL', 'SMS', 'IN_APP'], default: 'IN_APP' },
    channels: { type: [String], default: ['IN_APP'] },
    readAt: Date,
    sendAt: { type: Date, index: true },
    sentAt: Date,
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING', index: true },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model('Notification', NotificationSchema);
