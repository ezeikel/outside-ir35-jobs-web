import 'server-only';
import { JWT } from 'google-auth-library';

// FCM HTTP v1 sender. Mints an OAuth2 access token from the service-account JSON
// (base64 in FCM_SERVICE_ACCOUNT) and POSTs DATA-ONLY messages to
// fcm.googleapis.com. Data-only (no `notification` block) is deliberate: it
// guarantees the device's message handler runs in every state so notifee renders
// the rich card — a `notification` message would let the OS auto-display and skip
// the handler when the app is killed. Ported from the go-unbeaten sender.
// https://firebase.google.com/docs/cloud-messaging/send-message

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

let cached: { jwt: JWT; projectId: string } | null = null;

const getClient = (): { jwt: JWT; projectId: string } | null => {
  if (cached) return cached;
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(
      Buffer.from(raw, 'base64').toString('utf-8'),
    ) as ServiceAccount;
    const jwt = new JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: [FCM_SCOPE],
    });
    cached = { jwt, projectId: sa.project_id };
    return cached;
  } catch {
    return null;
  }
};

export const isFcmConfigured = (): boolean => getClient() !== null;

export type FcmMessage = {
  token: string;
  /** Carried in the FCM `data` block (all values must be strings). */
  title: string;
  body: string;
  /** Deep-link target — the app routes here on tap (e.g. /alerts, /job/<id>). */
  url: string;
  /** Android notification channel id for notifee display. */
  channelId?: string;
};

export type FcmTicket = {
  status: 'ok' | 'error';
  /** Set when FCM reports the token is gone, so the caller can prune it. */
  unregistered?: boolean;
};

const sendOne = async (
  accessToken: string,
  projectId: string,
  msg: FcmMessage,
): Promise<FcmTicket> => {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: msg.token,
            // The `data` block carries the rich payload BOTH platforms read in
            // their FCM handlers (notifee draws the card + keeps `url` for the
            // deep-link). Top-level stays data-only so Android's background
            // handler always runs; iOS display is driven by the apns.alert below.
            data: {
              title: msg.title,
              body: msg.body,
              url: msg.url,
              ...(msg.channelId ? { channelId: msg.channelId } : {}),
            },
            // FCM v1 AndroidConfig.priority is an enum — MUST be uppercase
            // 'HIGH' (lowercase 'high' is the legacy API and gets downgraded to
            // NORMAL, so a data-only message can be deferred/dropped in Doze and
            // never wakes the background handler).
            android: { priority: 'HIGH' },
            apns: {
              // alert push, priority 10 (immediate). A SILENT push
              // (content-available only) is NOT reliably delivered on a
              // backgrounded iOS device. An `alert` payload makes iOS display it
              // directly, and `mutable-content` lets the notifee Notification
              // Service Extension intercept it for rich styling.
              headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
              payload: {
                aps: {
                  alert: { title: msg.title, body: msg.body },
                  sound: 'default',
                  'mutable-content': 1,
                },
              },
            },
          },
        }),
      },
    );
    if (res.ok) return { status: 'ok' };
    // FCM returns 404 NOT_FOUND / 400 with UNREGISTERED for dead tokens.
    const text = await res.text();
    const unregistered =
      res.status === 404 || /UNREGISTERED|NOT_FOUND/.test(text);
    return { status: 'error', unregistered };
  } catch {
    return { status: 'error' };
  }
};

// Send a batch of FCM messages (one HTTP request each, concurrently). Returns a
// ticket per message in order. Never throws — failures become error tickets so
// the caller can prune unregistered tokens without aborting.
export const sendFcmPush = async (
  messages: FcmMessage[],
): Promise<FcmTicket[]> => {
  const client = getClient();
  if (!client) return messages.map(() => ({ status: 'error' as const }));

  let accessToken: string;
  try {
    const t = await client.jwt.getAccessToken();
    if (!t.token) throw new Error('no token');
    accessToken = t.token;
  } catch {
    return messages.map(() => ({ status: 'error' as const }));
  }

  return Promise.all(
    messages.map((m) => sendOne(accessToken, client.projectId, m)),
  );
};
