import mongoose from 'mongoose';

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['UPVOTE', 'LIKE', 'INSIGHTFUL'], default: 'UPVOTE' },
}, { _id: false });

const DiscussionPostSchema = new mongoose.Schema({
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionThread', index: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionPost' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  attachments: [String],
  reactions: { type: [ReactionSchema], default: () => [] },
  isModeratorNote: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('DiscussionPost', DiscussionPostSchema);
