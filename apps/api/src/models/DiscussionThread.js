import mongoose from 'mongoose';

const DiscussionThreadSchema = new mongoose.Schema({
  forum: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionForum', index: true },
  title: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pinned: { type: Boolean, default: false },
  tags: [String],
}, { timestamps: true });

export default mongoose.model('DiscussionThread', DiscussionThreadSchema);
