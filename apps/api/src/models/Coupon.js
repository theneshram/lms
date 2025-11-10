import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  description: String,
  discountType: { type: String, enum: ['PERCENT', 'AMOUNT'], default: 'PERCENT' },
  value: Number,
  maxUses: Number,
  used: { type: Number, default: 0 },
  startAt: Date,
  endAt: Date,
  applicableCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true });

export default mongoose.model('Coupon', CouponSchema);
