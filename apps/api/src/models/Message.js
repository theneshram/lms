import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageThread', index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  attachments: [String],
  type: { type: String, enum: ['TEXT', 'FILE', 'SYSTEM'], default: 'TEXT' },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
