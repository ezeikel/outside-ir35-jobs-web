import 'server-only';
import { db as prisma } from '@outside-ir35-jobs/db';
import { type FcmMessage, sendFcmPush } from './fcm';

// The Android notification channel notifee renders job/alert pushes on. Mobile
// must create a channel with this id (see apps/mobile/lib/push.ts).
const CHANNEL_ID = 'alerts';

export type PushTo = {
  userId: string;
  title: string;
  body: string;
  /** Deep-link the app opens on tap (e.g. '/alerts', '/job/<id>', '/profile'). */
  url: string;
};

/**
 * Send a push to every enabled device of one user. Best-effort: looks up the
 * user's PushSubscription rows, sends a data-only FCM message to each, and prunes
 * any token FCM reports unregistered. Returns how many devices were delivered to.
 * No-ops (returns 0) when push isn't configured or the user has no devices.
 */
export const pushToUser = async (msg: PushTo): Promise<number> => {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: msg.userId, enabled: true },
    select: { fcmToken: true },
  });
  if (subs.length === 0) return 0;

  const messages: FcmMessage[] = subs.map((s) => ({
    token: s.fcmToken,
    title: msg.title,
    body: msg.body,
    url: msg.url,
    channelId: CHANNEL_ID,
  }));

  const tickets = await sendFcmPush(messages);

  // Prune tokens FCM said are gone (uninstall / token rotation).
  const dead = subs
    .filter((_, i) => tickets[i]?.unregistered)
    .map((s) => s.fcmToken);
  if (dead.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { fcmToken: { in: dead } } })
      .catch(() => {
        // best-effort cleanup
      });
  }

  return tickets.filter((t) => t.status === 'ok').length;
};

/**
 * Send the same push to many users (one DB lookup per user, sent concurrently).
 * Used by the alerts cron. Returns total devices delivered to.
 */
export const pushToUsers = async (msgs: PushTo[]): Promise<number> => {
  const counts = await Promise.all(msgs.map((m) => pushToUser(m)));
  return counts.reduce((a, b) => a + b, 0);
};
