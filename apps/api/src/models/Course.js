import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema(
  {
    releaseAt: Date,
    closeAt: Date,
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE', 'INVITE_ONLY'], default: 'PRIVATE' },
  },
  { _id: false }
);

const ResourceSchema = new mongoose.Schema(
  {
    title: String,
    type: { type: String, enum: ['LINK', 'FILE', 'VIDEO', 'SCORM', 'YOUTUBE', 'VIMEO'] },
    url: String,
    fileId: String,
    version: { type: Number, default: 1 },
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
    schedule: ScheduleSchema,
  },
  { _id: false }
);

const ModuleSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    order: Number,
    releaseAt: Date,
    topics: [
      {
        title: String,
        order: Number,
        objectives: [String],
        resources: [ResourceSchema],
      },
    ],
  },
  { _id: false }
);

const ChannelSettingsSchema = new mongoose.Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  { _id: false }
);

const AccessRuleSchema = new mongoose.Schema(
  {
    minRole: { type: String, enum: ['STUDENT', 'TA', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'], default: 'STUDENT' },
    enforcePrerequisites: { type: Boolean, default: false },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId }],
    hideAfterDate: Date,
    readOnlyAfterDate: Date,
    restrictToCohorts: [String],
    allowDownloads: { type: Boolean, default: true },
  },
  { _id: false }
);

const AssetSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    label: String,
    type: { type: String, enum: ['FILE', 'LINK', 'VIDEO', 'IMAGE', 'AUDIO', 'DOC'], default: 'FILE' },
    url: String,
    fileId: String,
    description: String,
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
  },
  { _id: true }
);

const ActivitySchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['CONTENT', 'ASSIGNMENT', 'QUIZ', 'DISCUSSION', 'SESSION', 'CHECKLIST', 'RESOURCE'],
      default: 'CONTENT',
    },
    order: { type: Number, default: 0 },
    description: String,
    durationMinutes: Number,
    availability: {
      openAt: Date,
      dueAt: Date,
      closeAt: Date,
      hideAfterClose: { type: Boolean, default: false },
      readOnlyAfterDue: { type: Boolean, default: false },
    },
    completion: {
      required: { type: Boolean, default: false },
      minScore: Number,
    },
    assets: [AssetSchema],
    metadata: mongoose.Schema.Types.Mixed,
    accessRules: { type: AccessRuleSchema, default: () => ({}) },
  },
  { _id: true }
);

const SectionSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
    visibility: {
      roles: { type: [String], default: ['STUDENT', 'TEACHER', 'TA', 'ADMIN'] },
      requireEnrollment: { type: Boolean, default: true },
    },
    availability: {
      startAt: Date,
      endAt: Date,
      hideAfterEnd: { type: Boolean, default: false },
      readOnlyAfterEnd: { type: Boolean, default: false },
    },
    activities: [ActivitySchema],
    metadata: mongoose.Schema.Types.Mixed,
    accessRules: { type: AccessRuleSchema, default: () => ({}) },
  },
  { _id: true }
);

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
  modules: { type: [ModuleSchema], default: [] },
  resources: { type: [ResourceSchema], default: [] },
  sections: { type: [SectionSchema], default: [] },
  assets: { type: [AssetSchema], default: [] },
  timeline: {
    timezone: { type: String, default: 'UTC' },
    phases: {
      type: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          title: String,
          description: String,
          startDate: Date,
          endDate: Date,
          color: String,
        },
      ],
      default: [],
    },
    pacing: { type: String, enum: ['SELF_PACED', 'COHORT', 'BLENDED'], default: 'COHORT' },
  },
  notifications: {
    welcomeEmailEnabled: { type: Boolean, default: true },
    welcomeTemplate: {
      subject: { type: String, default: 'Welcome to {{course.title}}' },
      body: { type: String, default: 'We are excited to have you onboard.' },
      ctaLabel: { type: String, default: 'Open course' },
      ctaUrl: String,
    },
    events: {
      assignmentDue: {
        enabled: { type: Boolean, default: true },
        channels: { type: ChannelSettingsSchema, default: () => ({}) },
        leadMinutes: { type: Number, default: 60 },
      },
      sessionReminder: {
        enabled: { type: Boolean, default: true },
        channels: { type: ChannelSettingsSchema, default: () => ({}) },
        leadMinutes: { type: Number, default: 30 },
      },
      announcement: {
        enabled: { type: Boolean, default: true },
        channels: { type: ChannelSettingsSchema, default: () => ({}) },
      },
    },
  },
  communication: {
    welcomeEmail: {
      enabled: { type: Boolean, default: true },
      subject: { type: String, default: 'Welcome to {{course.title}}' },
      body: { type: String, default: 'Jump in and explore the first activities.' },
      senderName: String,
      replyTo: String,
    },
    postEnrollmentMessage: {
      enabled: { type: Boolean, default: false },
      body: String,
    },
  },
  builderVersion: { type: Number, default: 1 },
  contentVersion: { type: Number, default: 1 },
  metadata: mongoose.Schema.Types.Mixed,
  welcomeMessage: { type: String, default: 'Welcome to the course!' },
}, { timestamps: true });

export default mongoose.model('Course', CourseSchema);
