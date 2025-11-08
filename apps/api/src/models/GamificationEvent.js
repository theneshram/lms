import mongoose from 'mongoose';

const GamificationEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  type: { type: String, enum: ['POINTS', 'LEVEL', 'QUEST'], default: 'POINTS' },
  points: { type: Number, default: 0 },
  level: Number,
  description: String,
}, { timestamps: true });

const LeaderboardEntrySchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  position: Number,
}, { timestamps: true });

LeaderboardEntrySchema.index({ course: 1, user: 1 }, { unique: true });

export const LeaderboardEntry = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);
export default mongoose.model('GamificationEvent', GamificationEventSchema);
