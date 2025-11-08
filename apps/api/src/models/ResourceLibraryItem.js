import mongoose from 'mongoose';

const ResourceLibraryItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  tags: [String],
  fileUrl: String,
  type: { type: String, enum: ['PDF', 'VIDEO', 'IMAGE', 'SCORM', 'LINK', 'DOC'], default: 'LINK' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
  versions: [{ version: Number, fileUrl: String, createdAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
}, { timestamps: true });

ResourceLibraryItemSchema.index({ title: 'text', tags: 'text' });

export default mongoose.model('ResourceLibraryItem', ResourceLibraryItemSchema);
