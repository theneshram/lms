import mongoose from 'mongoose';

const BreakoutRoomSchema = new mongoose.Schema({
  title: String,
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const PollSchema = new mongoose.Schema({
  question: String,
  options: [{ label: String, votes: { type: Number, default: 0 } }],
}, { _id: false });

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    includeStartReminder: { type: Boolean, default: true },
    includeEndSummary: { type: Boolean, default: false },
    channels: { type: [String], default: ['EMAIL', 'IN_APP'] },
    messageOverride: String,
  },
  { _id: false }
);

const VirtualSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
    provider: { type: String, enum: ['ZOOM', 'TEAMS', 'BBB', 'MEET'], default: 'ZOOM' },
    title: String,
    description: String,
    meetingUrl: String,
    startAt: Date,
    endAt: Date,
    recordingUrl: String,
    whiteboardUrl: String,
    polls: [PollSchema],
    breakoutRooms: [BreakoutRoomSchema],
    attendees: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, joinedAt: Date, leftAt: Date }],
    notifications: { type: NotificationPreferenceSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model('VirtualSession', VirtualSessionSchema);
