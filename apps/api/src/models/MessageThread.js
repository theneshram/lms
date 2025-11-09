import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['OWNER', 'MEMBER'], default: 'MEMBER' },
}, { _id: false });

const MessageThreadSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ['DIRECT', 'GROUP'], default: 'DIRECT' },
  participants: [ParticipantSchema],
}, { timestamps: true });

export default mongoose.model('MessageThread', MessageThreadSchema);
