import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ProfileSchema = new mongoose.Schema({
  photoUrl: String,
  bio: String,
  skills: [String],
  timezone: String,
  language: String,
  website: String,
  social: {
    linkedin: String,
    twitter: String,
    github: String,
  },
  customFields: mongoose.Schema.Types.Mixed,
}, { _id: false });

const PreferenceSchema = new mongoose.Schema({
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },
  locale: { type: String, default: 'en' },
  theme: { type: String, default: 'light' },
}, { _id: false });

const RbacAssignmentSchema = new mongoose.Schema({
  scope: { type: String, enum: ['GLOBAL', 'COURSE', 'GROUP'], default: 'GLOBAL' },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  role: { type: String, required: true },
}, { _id: false });

const SsoSchema = new mongoose.Schema({
  provider: String,
  providerId: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { _id: false });

const PasswordResetSchema = new mongoose.Schema({
  token: String,
  expiresAt: Date,
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['ADMIN', 'TEACHER', 'TA', 'STUDENT'],
    default: 'STUDENT',
    index: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INVITED', 'SUSPENDED'],
    default: 'ACTIVE',
  },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true }],
  profile: { type: ProfileSchema, default: () => ({}) },
  preferences: { type: PreferenceSchema, default: () => ({}) },
  rbac: { type: [RbacAssignmentSchema], default: () => [] },
  sso: SsoSchema,
  lastLoginAt: Date,
  activityStats: {
    loginCount: { type: Number, default: 0 },
    completedCourses: { type: Number, default: 0 },
    badgesEarned: { type: Number, default: 0 },
  },
  passwordReset: { type: PasswordResetSchema, default: () => ({}) },
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.compare = function(pw) {
  return bcrypt.compare(pw, this.password);
};

export default mongoose.model('User', UserSchema);
