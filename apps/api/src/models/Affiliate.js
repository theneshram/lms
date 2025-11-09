import mongoose from 'mongoose';

const AffiliateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  code: { type: String, unique: true },
  commissionRate: { type: Number, default: 0.1 },
  payoutEmail: String,
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Affiliate', AffiliateSchema);
