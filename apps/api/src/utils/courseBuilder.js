import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';

export function normalizeActivityPayload(payload = {}) {
  return {
    _id: payload._id ? new mongoose.Types.ObjectId(payload._id) : new mongoose.Types.ObjectId(),
    title: payload.title || 'Untitled activity',
    type: payload.type || 'CONTENT',
    order: typeof payload.order === 'number' ? payload.order : 0,
    description: payload.description,
    durationMinutes: payload.durationMinutes,
    availability: payload.availability || undefined,
    completion: payload.completion || undefined,
    assets: Array.isArray(payload.assets)
      ? payload.assets.map((asset) => normalizeAssetPayload(asset))
      : undefined,
    metadata: payload.metadata,
  };
}

export function normalizeSectionPayload(course, payload = {}) {
  const sectionCount = Array.isArray(course.sections) ? course.sections.length : 0;
  return {
    _id: payload._id ? new mongoose.Types.ObjectId(payload._id) : new mongoose.Types.ObjectId(),
    title: payload.title || `Section ${sectionCount + 1}`,
    description: payload.description,
    order: typeof payload.order === 'number' ? payload.order : sectionCount,
    visibility: payload.visibility || undefined,
    availability: payload.availability || undefined,
    metadata: payload.metadata,
    activities: Array.isArray(payload.activities) ? payload.activities.map((act) => normalizeActivityPayload(act)) : [],
  };
}

export function normalizeAssetPayload(payload = {}) {
  return {
    _id: payload._id ? new mongoose.Types.ObjectId(payload._id) : new mongoose.Types.ObjectId(),
    label: payload.label || 'Untitled asset',
    type: payload.type || 'FILE',
    url: payload.url,
    fileId: payload.fileId,
    description: payload.description,
    tags: payload.tags,
    metadata: payload.metadata,
  };
}

export async function ensureActivityReferences(activity, { quizModel = Quiz } = {}) {
  if (!activity) return;
  if (activity.type === 'QUIZ') {
    const quizId = activity.metadata?.quizId;
    if (!quizId) throw new Error('Quiz activity requires metadata.quizId');
    const exists = await quizModel.exists({ _id: quizId });
    if (!exists) throw new Error('Referenced quiz does not exist');
  }
  if (activity.assets) {
    activity.assets.forEach((asset, index) => {
      if (!asset.label) {
        activity.assets[index].label = `Asset ${index + 1}`;
      }
    });
  }
}

export function compileWelcomeEmail(course, user, overrides = {}) {
  const template = overrides.subject || overrides.body ? overrides : course.communication?.welcomeEmail || {};
  const context = {
    'course.title': course.title,
    'course.code': course.code,
    'user.name': user?.name || 'there',
  };
  const subject = renderTemplate(template.subject || `Welcome to ${course.title}`, context);
  const html = renderTemplate(template.body || course.welcomeMessage || 'Welcome aboard!', context);
  const text = html.replace(/<[^>]+>/g, '');
  return { subject, html, text };
}

function renderTemplate(input = '', context = {}) {
  return input.replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => context[key] ?? '');
}

export function sanitizeSearchInput(input = '') {
  return input.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function channelsToList(channels, fallback = ['EMAIL', 'IN_APP']) {
  if (Array.isArray(channels)) {
    return channels;
  }
  if (!channels) {
    return Array.isArray(fallback) ? fallback : objectChannelsToList(fallback);
  }
  return objectChannelsToList(channels, fallback);
}

function objectChannelsToList(obj = {}, fallback = ['EMAIL', 'IN_APP']) {
  const list = [];
  if (obj.email ?? fallback?.email ?? true) list.push('EMAIL');
  if (obj.sms) list.push('SMS');
  if (obj.inApp ?? fallback?.inApp ?? true) list.push('IN_APP');
  if (!list.length && Array.isArray(fallback)) return fallback;
  return list;
}
