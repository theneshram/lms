import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate' },
  issuedAt: { type: Date, default: Date.now },
  data: mongoose.Schema.Types.Mixed,
  shareUrl: String,
}, { timestamps: true });

CertificateSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('Certificate', CertificateSchema);
