import mongoose from 'mongoose';

const QuestSchema = new mongoose.Schema({
  title: String,
  description: String,
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  milestones: [{ label: String, progress: Number }],
  rewards: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
}, { timestamps: true });

export default mongoose.model('Quest', QuestSchema);
