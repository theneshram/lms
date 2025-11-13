import mongoose from 'mongoose';

const ThemePaletteSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    description: String,
    mode: { type: String, enum: ['LIGHT', 'DARK', 'SYSTEM'], default: 'SYSTEM' },
    colors: {
      primary: String,
      secondary: String,
      accent: String,
      background: String,
      surface: String,
      muted: String,
      border: String,
      text: String,
      textMuted: String,
    },
  },
  { _id: false }
);

const TypographySchema = new mongoose.Schema(
  {
    heading: { type: String, default: 'Inter' },
    body: { type: String, default: 'Inter' },
  },
  { _id: false }
);

const HeaderSchema = new mongoose.Schema(
  {
    logoUrl: String,
    title: { type: String, default: 'Learning Management System' },
    applicationName: { type: String, default: 'LMS' },
    showLogo: { type: Boolean, default: true },
  },
  { _id: false }
);

const FooterSchema = new mongoose.Schema(
  {
    organization: { type: String, default: 'Aathith Prime Business Private Limited' },
    legal: { type: String, default: 'All rights reserved.' },
    customText: String,
    showYear: { type: Boolean, default: true },
  },
  { _id: false }
);

const AppearanceSchema = new mongoose.Schema(
  {
    themeMode: { type: String, enum: ['LIGHT', 'DARK', 'SYSTEM'], default: 'SYSTEM' },
    activePaletteId: { type: String, default: 'sunrise-horizon' },
    palettes: { type: [ThemePaletteSchema], default: undefined },
    typography: { type: TypographySchema, default: () => ({}) },
    header: { type: HeaderSchema, default: () => ({}) },
    footer: { type: FooterSchema, default: () => ({}) },
    allowUserToggle: { type: Boolean, default: true },
  },
  { _id: false }
);

const LocalizationSchema = new mongoose.Schema(
  {
    timezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'YYYY-MM-DD' },
    gradingFormat: { type: String, default: 'PERCENTAGE' },
    languages: [{ code: String, label: String }],
  },
  { _id: false }
);

const DirectorySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['NONE', 'AZURE_AD', 'OKTA', 'GOOGLE', 'GENERIC_SAML'],
      default: 'NONE',
    },
    domain: String,
    metadataUrl: String,
    clientId: String,
    clientSecret: String,
    defaultRole: { type: String, default: 'STUDENT' },
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const DatabaseSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['LOCAL', 'ATLAS', 'CUSTOM'], default: 'LOCAL' },
    uri: String,
    dbName: { type: String, default: 'lms' },
    lastAppliedAt: Date,
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const SmtpSchema = new mongoose.Schema(
  {
    host: String,
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: String,
    password: String,
    fromName: String,
    fromEmail: String,
  },
  { _id: false }
);

const EmailTemplateSchema = new mongoose.Schema(
  {
    key: String,
    name: String,
    subject: String,
    html: String,
    text: String,
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const MailSchema = new mongoose.Schema(
  {
    smtp: { type: SmtpSchema, default: () => ({}) },
    templates: { type: [EmailTemplateSchema], default: undefined },
  },
  { _id: false }
);

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    eventStartLeadMinutes: { type: Number, default: 30 },
    eventEndLeadMinutes: { type: Number, default: 15 },
    defaultChannels: { type: [String], default: ['EMAIL', 'IN_APP'] },
  },
  { _id: false }
);

const StorageLimitSchema = new mongoose.Schema(
  {
    maxFileSizeMb: { type: Number, default: 512 },
    totalQuotaGb: { type: Number, default: 20 },
    allowVideos: { type: Boolean, default: true },
    allowDocuments: { type: Boolean, default: true },
    allowImages: { type: Boolean, default: true },
    allowScorm: { type: Boolean, default: true },
  },
  { _id: false }
);

const StorageSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['LOCAL', 'AWS_S3', 'AZURE_BLOB', 'GCP', 'ONEDRIVE'],
      default: 'LOCAL',
    },
    local: {
      root: { type: String, default: 'storage/uploads' },
      baseUrl: String,
    },
    aws: {
      bucket: String,
      region: String,
      accessKeyId: String,
      secretAccessKey: String,
    },
    azure: {
      connectionString: String,
      container: String,
    },
    gcp: {
      bucket: String,
      projectId: String,
      credentialsJson: String,
    },
    onedrive: {
      clientId: String,
      clientSecret: String,
      tenantId: String,
      driveId: String,
    },
    uploadLimits: { type: StorageLimitSchema, default: () => ({}) },
    archiveAfterDays: Number,
  },
  { _id: false }
);

const DemoCourseSchema = new mongoose.Schema(
  {
    code: { type: String, default: 'DEMO-COURSE' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    autoEnroll: { type: Boolean, default: true },
    highlight: String,
    lastRefreshedAt: Date,
  },
  { _id: false }
);

const ObservabilitySchema = new mongoose.Schema(
  {
    enableStorageTelemetry: { type: Boolean, default: true },
    enableUserPresence: { type: Boolean, default: true },
    enableActivityStream: { type: Boolean, default: true },
    retentionDays: { type: Number, default: 30 },
  },
  { _id: false }
);

const defaultPalettes = [
  {
    id: 'sunrise-horizon',
    name: 'Sunrise Horizon',
    description: 'Vibrant amber paired with deep navy inspired by Figma palettes',
    mode: 'SYSTEM',
    colors: {
      primary: '#F97316',
      secondary: '#2563EB',
      accent: '#9333EA',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      muted: '#E2E8F0',
      border: '#CBD5F5',
      'border-soft': 'rgba(148, 163, 184, 0.25)',
      'header-bg': 'rgba(255, 255, 255, 0.85)',
      'footer-bg': 'rgba(255, 255, 255, 0.82)',
      'nav-bg': 'rgba(255, 255, 255, 0.6)',
      text: '#0F172A',
      textMuted: '#475569',
    },
    colorsDark: {
      primary: '#FB923C',
      secondary: '#60A5FA',
      accent: '#C084FC',
      background: '#0F172A',
      surface: '#1E293B',
      muted: '#334155',
      border: '#475569',
      'border-soft': 'rgba(100, 116, 139, 0.35)',
      'header-bg': 'rgba(15, 23, 42, 0.88)',
      'footer-bg': 'rgba(15, 23, 42, 0.82)',
      'nav-bg': 'rgba(30, 41, 59, 0.7)',
      text: '#F8FAFC',
      textMuted: '#CBD5F5',
    },
  },
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    description: 'Teal and indigo combination for dark mode friendly experience',
    mode: 'SYSTEM',
    colors: {
      primary: '#0EA5E9',
      secondary: '#1E3A8A',
      accent: '#22D3EE',
      background: '#F1F5F9',
      surface: '#FFFFFF',
      muted: '#E2E8F0',
      border: '#CBD5F5',
      'border-soft': 'rgba(148, 163, 184, 0.25)',
      'header-bg': 'rgba(255, 255, 255, 0.85)',
      'footer-bg': 'rgba(255, 255, 255, 0.82)',
      'nav-bg': 'rgba(255, 255, 255, 0.6)',
      text: '#0F172A',
      textMuted: '#475569',
    },
    colorsDark: {
      primary: '#0EA5E9',
      secondary: '#1E3A8A',
      accent: '#22D3EE',
      background: '#0F172A',
      surface: '#102A43',
      muted: '#1E3A5F',
      border: '#1D4ED8',
      'border-soft': 'rgba(14, 165, 233, 0.28)',
      'header-bg': 'rgba(8, 47, 73, 0.9)',
      'footer-bg': 'rgba(8, 47, 73, 0.85)',
      'nav-bg': 'rgba(14, 116, 144, 0.6)',
      text: '#F8FAFC',
      textMuted: '#BAE6FD',
    },
  },
  {
    id: 'figma-serenity',
    name: 'Figma Serenity',
    description: 'Balanced blue and lavender taken from Figma color library',
    mode: 'SYSTEM',
    colors: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      accent: '#F59E0B',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      muted: '#E5E7EB',
      border: '#D1D5DB',
      'border-soft': 'rgba(191, 219, 254, 0.35)',
      'header-bg': 'rgba(255, 255, 255, 0.85)',
      'footer-bg': 'rgba(255, 255, 255, 0.82)',
      'nav-bg': 'rgba(255, 255, 255, 0.6)',
      text: '#111827',
      textMuted: '#6B7280',
    },
    colorsDark: {
      primary: '#818CF8',
      secondary: '#A855F7',
      accent: '#FBBF24',
      background: '#111827',
      surface: '#1F2937',
      muted: '#374151',
      border: '#4C51BF',
      'border-soft': 'rgba(129, 140, 248, 0.3)',
      'header-bg': 'rgba(17, 24, 39, 0.9)',
      'footer-bg': 'rgba(17, 24, 39, 0.86)',
      'nav-bg': 'rgba(76, 81, 191, 0.45)',
      text: '#F9FAFB',
      textMuted: '#E0E7FF',
    },
  },
  {
    id: 'earthy-minimal',
    name: 'Earthy Minimal',
    description: 'Calm neutral palette for business friendly interfaces',
    mode: 'SYSTEM',
    colors: {
      primary: '#047857',
      secondary: '#059669',
      accent: '#F97316',
      background: '#F1F5F9',
      surface: '#FFFFFF',
      muted: '#E2E8F0',
      border: '#CBD5F5',
      'border-soft': 'rgba(148, 163, 184, 0.25)',
      'header-bg': 'rgba(255, 255, 255, 0.85)',
      'footer-bg': 'rgba(255, 255, 255, 0.82)',
      'nav-bg': 'rgba(255, 255, 255, 0.6)',
      text: '#0F172A',
      textMuted: '#475569',
    },
    colorsDark: {
      primary: '#10B981',
      secondary: '#34D399',
      accent: '#FB923C',
      background: '#111827',
      surface: '#1E293B',
      muted: '#334155',
      border: '#0F766E',
      'border-soft': 'rgba(16, 185, 129, 0.28)',
      'header-bg': 'rgba(15, 118, 110, 0.3)',
      'footer-bg': 'rgba(15, 118, 110, 0.26)',
      'nav-bg': 'rgba(15, 118, 110, 0.24)',
      text: '#ECFDF5',
      textMuted: '#A7F3D0',
    },
  },
  {
    id: 'bold-citrus',
    name: 'Bold Citrus',
    description: 'Energetic lime and emerald pairing for gamified experiences',
    mode: 'SYSTEM',
    colors: {
      primary: '#65A30D',
      secondary: '#15803D',
      accent: '#FACC15',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      muted: '#E5E7EB',
      border: '#D1D5DB',
      'border-soft': 'rgba(190, 242, 100, 0.35)',
      'header-bg': 'rgba(255, 255, 255, 0.85)',
      'footer-bg': 'rgba(255, 255, 255, 0.82)',
      'nav-bg': 'rgba(255, 255, 255, 0.6)',
      text: '#082F49',
      textMuted: '#1E3A8A',
    },
    colorsDark: {
      primary: '#84CC16',
      secondary: '#22C55E',
      accent: '#FACC15',
      background: '#0F172A',
      surface: '#1E293B',
      muted: '#334155',
      border: '#166534',
      'border-soft': 'rgba(34, 197, 94, 0.28)',
      'header-bg': 'rgba(22, 101, 52, 0.35)',
      'footer-bg': 'rgba(22, 101, 52, 0.3)',
      'nav-bg': 'rgba(52, 211, 153, 0.25)',
      text: '#ECFCCB',
      textMuted: '#BBF7D0',
    },
  },
];

const defaultTemplates = [
  {
    key: 'user-welcome',
    name: 'User Account Created',
    subject: 'Welcome to the Learning Management System',
    html: '<h1>Welcome {{name}}</h1><p>Your LMS account has been created successfully.</p>',
    text: 'Welcome {{name}}! Your LMS account has been created successfully.',
  },
  {
    key: 'password-reset',
    name: 'Password Reset',
    subject: 'Reset your LMS password',
    html: '<p>Hello {{name}},</p><p>Use the following code to reset your password: <strong>{{token}}</strong></p>',
    text: 'Hello {{name}}, use this code to reset your password: {{token}}',
  },
  {
    key: 'course-enrollment',
    name: 'Course Enrollment Confirmation',
    subject: 'You are enrolled in {{course}}',
    html: '<p>Congratulations {{name}}!</p><p>You have been enrolled in <strong>{{course}}</strong>.</p>',
    text: 'Congratulations {{name}}! You have been enrolled in {{course}}.',
  },
  {
    key: 'course-welcome-html',
    name: 'Course Welcome HTML',
    subject: 'Welcome to your new course {{course}}',
    html: '<section style="font-family: Inter, sans-serif"><h2>Welcome aboard!</h2><p>{{message}}</p></section>',
    text: 'Welcome to {{course}}! {{message}}',
  },
];

const SystemSettingSchema = new mongoose.Schema(
  {
    appearance: {
      type: AppearanceSchema,
      default: () => ({
        palettes: defaultPalettes.map((palette) => ({
          ...palette,
          colors: { ...palette.colors },
          ...(palette.colorsDark ? { colorsDark: { ...palette.colorsDark } } : {}),
          ...(palette.colorsLight ? { colorsLight: { ...palette.colorsLight } } : {}),
        })),
      }),
    },
    localization: { type: LocalizationSchema, default: () => ({}) },
    directory: { type: DirectorySchema, default: () => ({}) },
    database: { type: DatabaseSchema, default: () => ({}) },
    mail: {
      type: MailSchema,
      default: () => ({
        templates: defaultTemplates.map((template) => ({ ...template })),
      }),
    },
    notifications: { type: NotificationPreferenceSchema, default: () => ({}) },
    storage: { type: StorageSchema, default: () => ({}) },
    demoCourse: { type: DemoCourseSchema, default: () => ({}) },
    observability: { type: ObservabilitySchema, default: () => ({}) },
    apiKeys: mongoose.Schema.Types.Mixed,
    integrations: mongoose.Schema.Types.Mixed,
    dataRetentionDays: { type: Number, default: 365 },
    gdprCompliant: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SystemSettingSchema.statics.getSingleton = async function getSingleton() {
  const existing = await this.findOne();
  if (existing) {
    if (!existing.appearance?.palettes?.length) {
      existing.appearance = {
        ...(existing.appearance?.toObject?.() ?? existing.appearance ?? {}),
        palettes: defaultPalettes.map((palette) => ({
          ...palette,
          colors: { ...palette.colors },
          ...(palette.colorsDark ? { colorsDark: { ...palette.colorsDark } } : {}),
          ...(palette.colorsLight ? { colorsLight: { ...palette.colorsLight } } : {}),
        })),
      };
      await existing.save();
    }
    if (!existing.mail?.templates?.length) {
      existing.mail = {
        ...(existing.mail?.toObject?.() ?? existing.mail ?? {}),
        templates: defaultTemplates.map((template) => ({ ...template })),
      };
      await existing.save();
    }
    if (!existing.storage) {
      existing.storage = {};
      await existing.save();
    }
    if (!existing.database?.provider) {
      existing.database = {
        ...(existing.database?.toObject?.() ?? existing.database ?? {}),
        provider: 'LOCAL',
      };
      await existing.save();
    }
    if (!existing.demoCourse) {
      existing.demoCourse = {};
      await existing.save();
    }
    if (!existing.observability) {
      existing.observability = {};
      await existing.save();
    }
    return existing;
  }
  return this.create({});
};

export default mongoose.model('SystemSetting', SystemSettingSchema);
export { defaultPalettes, defaultTemplates };
