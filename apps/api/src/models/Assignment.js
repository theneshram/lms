import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  title: { type: String, required: true },
  description: String,
  dueAt: Date,
  maxPoints: { type: Number, default: 100 },
  attachments: [String]
}, { timestamps: true });

export default mongoose.model('Assignment', AssignmentSchema);