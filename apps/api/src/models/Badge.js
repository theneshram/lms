import mongoose from 'mongoose';

const BadgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  iconUrl: String,
  criteria: mongoose.Schema.Types.Mixed,
  category: String,
}, { timestamps: true });

const UserBadgeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  badge: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', index: true },
  awardedAt: { type: Date, default: Date.now },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
}, { timestamps: true });

UserBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

export const UserBadge = mongoose.model('UserBadge', UserBadgeSchema);
export default mongoose.model('Badge', BadgeSchema);
