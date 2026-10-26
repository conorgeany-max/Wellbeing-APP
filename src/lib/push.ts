import { api } from './cloud';
import { setSetting } from '../db/settings';

// Daily reminders as real push notifications, sent by the "reminders" Netlify
// function even when Steady is closed. On iPhone this needs iOS 16.4+ and the
// app added to the Home Screen.

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Ask permission, subscribe this device and save its reminder time. */
export async function enablePush(time: string) {
  if (!pushSupported()) throw new Error('This browser does not support notifications. On iPhone, add Steady to your Home Screen first.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for Steady in your browser or phone settings.');
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api<{ publicKey: string }>('push');
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await api('push', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON(), time, timezone: timezone() }) });
  await setSetting('pushEnabled', true);
}

/** Update the time on the server after the reminder time changes. */
export async function updatePushTime(time: string) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await api('push', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON(), time, timezone: timezone() }) });
}

export async function disablePush() {
  if (pushSupported()) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
      await sub.unsubscribe();
    }
  }
  await setSetting('pushEnabled', false);
}
