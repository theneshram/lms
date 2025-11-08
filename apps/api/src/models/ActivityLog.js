import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, index: true },
  entityType: { type: String, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  metadata: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  occurredAt: { type: Date, default: Date.now },
}, { timestamps: true });

ActivityLogSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model('ActivityLog', ActivityLogSchema);
