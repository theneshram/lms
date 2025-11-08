import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  releaseAt: Date,
  closeAt: Date,
  visibility: { type: String, enum: ['PUBLIC', 'PRIVATE', 'INVITE_ONLY'], default: 'PRIVATE' },
}, { _id: false });

const ResourceSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ['LINK', 'FILE', 'VIDEO', 'SCORM', 'YOUTUBE', 'VIMEO'] },
  url: String,
  fileId: String,
  version: { type: Number, default: 1 },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  schedule: ScheduleSchema,
}, { _id: false });

const ModuleSchema = new mongoose.Schema({
  title: String,
  description: String,
  order: Number,
  releaseAt: Date,
  topics: [{
    title: String,
    order: Number,
    objectives: [String],
    resources: [ResourceSchema],
  }],
}, { _id: false });

const CourseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  image: String,
  startDate: Date,
  endDate: Date,
  durationWeeks: Number,
  category: String,
  subject: String,
  level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER' },
  department: String,
  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teachingAssistants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  visibility: { type: String, enum: ['PUBLIC', 'PRIVATE', 'INVITE_ONLY'], default: 'PRIVATE' },
  enrollmentLimit: Number,
  enrollmentExpiryDays: Number,
  allowSelfEnrollment: { type: Boolean, default: false },
  enrollmentKey: String,
  modules: [ModuleSchema],
  resources: [ResourceSchema],
  contentVersion: { type: Number, default: 1 },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model('Course', CourseSchema);
