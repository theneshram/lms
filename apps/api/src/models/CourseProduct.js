import mongoose from 'mongoose';

const CourseProductSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', unique: true },
  price: Number,
  currency: { type: String, default: 'USD' },
  visible: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  bundles: [{ title: String, courseIds: [mongoose.Schema.Types.ObjectId], price: Number }],
}, { timestamps: true });

export default mongoose.model('CourseProduct', CourseProductSchema);
