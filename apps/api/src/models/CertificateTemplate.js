import mongoose from 'mongoose';

const CertificateTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  backgroundUrl: String,
  logoUrl: String,
  signatureUrl: String,
  watermarkUrl: String,
  fields: [{ key: String, label: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('CertificateTemplate', CertificateTemplateSchema);
