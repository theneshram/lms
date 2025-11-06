import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    maxPoints: { type: Number, default: 100 }
  },
  { timestamps: true }
);

export default mongoose.model('Assignment', AssignmentSchema);