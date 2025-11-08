import mongoose from 'mongoose';

const AutomationRuleSchema = new mongoose.Schema({
  name: String,
  trigger: String,
  conditions: mongoose.Schema.Types.Mixed,
  actions: mongoose.Schema.Types.Mixed,
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('AutomationRule', AutomationRuleSchema);
