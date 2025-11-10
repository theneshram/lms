import mongoose from 'mongoose';

const PaymentRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  provider: { type: String, enum: ['STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL'] },
  amount: Number,
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  transactionId: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

PaymentRecordSchema.index({ course: 1, user: 1, provider: 1 });

export default mongoose.model('PaymentRecord', PaymentRecordSchema);
