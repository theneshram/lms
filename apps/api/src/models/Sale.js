import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  amount: Number,
  currency: { type: String, default: 'USD' },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  affiliate: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate' },
  status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PAID' },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

SaleSchema.index({ course: 1, user: 1 });

export default mongoose.model('Sale', SaleSchema);
