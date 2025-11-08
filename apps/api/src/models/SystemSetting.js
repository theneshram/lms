import mongoose from 'mongoose';

const BrandingSchema = new mongoose.Schema({
  name: String,
  logoUrl: String,
  primaryColor: String,
  secondaryColor: String,
}, { _id: false });

const LocalizationSchema = new mongoose.Schema({
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'YYYY-MM-DD' },
  gradingFormat: { type: String, default: 'PERCENTAGE' },
  languages: [{ code: String, label: String }],
}, { _id: false });

const SystemSettingSchema = new mongoose.Schema({
  branding: { type: BrandingSchema, default: () => ({}) },
  localization: { type: LocalizationSchema, default: () => ({}) },
  apiKeys: mongoose.Schema.Types.Mixed,
  integrations: mongoose.Schema.Types.Mixed,
  dataRetentionDays: { type: Number, default: 365 },
  gdprCompliant: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('SystemSetting', SystemSettingSchema);
