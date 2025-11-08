import mongoose from 'mongoose';

const VersionSchema = new mongoose.Schema({
  version: Number,
  fileUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ContentItemSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  moduleId: String,
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['PDF', 'PPT', 'VIDEO', 'SCORM', 'YOUTUBE', 'AUDIO', 'TEXT', 'LINK'],
    default: 'TEXT',
  },
  description: String,
  url: String,
  fileId: String,
  embeddedHtml: String,
  tags: [String],
  schedule: {
    releaseAt: Date,
    closeAt: Date,
    releaseCondition: { type: String, enum: ['DATE', 'PROGRESS'], default: 'DATE' },
    progressRequired: { type: Number, default: 0 },
  },
  versions: { type: [VersionSchema], default: () => [] },
  latestVersion: { type: Number, default: 1 },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

ContentItemSchema.index({ course: 1, moduleId: 1 });

export default mongoose.model('ContentItem', ContentItemSchema);
