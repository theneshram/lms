import Notification from '../models/Notification.js';
import SystemSetting from '../models/SystemSetting.js';
import { sendMail } from './mailer.js';
import { channelsToList } from '../utils/courseBuilder.js';

let intervalHandle = null;
const POLL_INTERVAL_MS = 60 * 1000;

async function processDueNotifications() {
  const now = new Date();
  const pending = await Notification.find({ status: 'PENDING', sendAt: { $lte: now } })
    .limit(25)
    .populate('user', 'email name');

  if (!pending.length) return;

  const settings = await SystemSetting.getSingleton();
  const defaultChannels = channelsToList(settings.notifications?.defaultChannels);

  for (const notification of pending) {
    try {
      const channels = channelsToList(notification.channels, defaultChannels);
      if (channels.includes('EMAIL') && notification.user?.email) {
        await sendMail({
          to: notification.user.email,
          subject: notification.subject || notification.title || 'LMS Notification',
          html: notification.html || `<p>${notification.message ?? ''}</p>`,
          text: notification.message ?? '',
        });
      }
      notification.status = 'SENT';
      notification.sentAt = new Date();
      await notification.save();
    } catch (err) {
      notification.status = 'FAILED';
      await notification.save();
      console.error('[notificationScheduler] failed to send notification', notification._id, err);
    }
  }
}

export function startNotificationScheduler() {
  if (intervalHandle) return;
  intervalHandle = setInterval(processDueNotifications, POLL_INTERVAL_MS);
}

export async function queueNotification(payload) {
  const doc = await Notification.create(payload);
  return doc;
}

export default {
  startNotificationScheduler,
  queueNotification,
};
