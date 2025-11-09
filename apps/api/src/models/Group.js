import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, index: true },
  type: { type: String, enum: ['CLASS', 'BATCH', 'DEPARTMENT', 'TEAM'], default: 'CLASS' },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model('Group', GroupSchema);
