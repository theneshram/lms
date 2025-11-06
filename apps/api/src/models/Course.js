import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  image: String,
  startDate: Date,
  endDate: Date,
  durationWeeks: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teachingAssistants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Course', CourseSchema);