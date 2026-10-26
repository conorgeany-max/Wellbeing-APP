import type { Config } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { requireAccess } from '../lib/auth.mts';
import { pushStore, type PushRecord } from '../lib/store.mts';

const keyFor = (endpoint: string) => `sub-${createHash('sha256').update(endpoint).digest('hex').slice(0, 32)}`;

// GET: the public VAPID key the browser needs to subscribe.
// POST: save this device's subscription and reminder time. DELETE: remove it.
export default async (req: Request) => {
  if (req.method === 'GET') {
    const publicKey = Netlify.env.get('VAPID_PUBLIC_KEY');
    return publicKey ? Response.json({ publicKey }) : Response.json({ error: 'Push is not set up.' }, { status: 503 });
  }

  const denied = requireAccess(req);
  if (denied) return denied;
  const store = pushStore();

  if (req.method === 'POST') {
    const body = (await req.json()) as Partial<PushRecord>;
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !/^\d{2}:\d{2}$/.test(body.time ?? '') || !body.timezone) {
      return Response.json({ error: 'Missing subscription, time or timezone.' }, { status: 400 });
    }
    const key = keyFor(sub.endpoint);
    const existing = (await store.get(key, { type: 'json' })) as PushRecord | null;
    const record: PushRecord = { subscription: sub, time: body.time!, timezone: body.timezone, lastSent: existing?.lastSent ?? null };
    await store.setJSON(key, record);
    return Response.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (endpoint) await store.delete(keyFor(endpoint));
    return new Response(null, { status: 204 });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = { path: '/api/push', method: ['GET', 'POST', 'DELETE'] };
