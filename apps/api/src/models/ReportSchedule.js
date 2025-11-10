import mongoose from 'mongoose';

const ReportScheduleSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['USER', 'COURSE', 'ADMIN'], default: 'USER' },
  format: { type: String, enum: ['CSV', 'XLSX', 'PDF'], default: 'CSV' },
  recipients: [String],
  cron: String,
  lastRunAt: Date,
  filters: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('ReportSchedule', ReportScheduleSchema);
