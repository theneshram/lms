import mongoose from 'mongoose';

const RecommendationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  courses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    reason: String,
    score: Number,
  }],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Recommendation', RecommendationSchema);
