import mongoose from 'mongoose';

const DiscussionForumSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
  title: { type: String, required: true },
  scope: { type: String, enum: ['COURSE', 'TOPIC'], default: 'COURSE' },
  topicId: String,
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model('DiscussionForum', DiscussionForumSchema);
