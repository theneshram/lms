import mongoose from 'mongoose';

const IntegrationConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['PAYMENT', 'VIDEO', 'COMMUNICATION', 'LTI', 'CRM', 'SSO'],
    required: true,
  },
  provider: String,
  settings: mongoose.Schema.Types.Mixed,
  enabled: { type: Boolean, default: false },
}, { timestamps: true });

IntegrationConfigSchema.index({ type: 1, provider: 1 }, { unique: true });

export default mongoose.model('IntegrationConfig', IntegrationConfigSchema);
