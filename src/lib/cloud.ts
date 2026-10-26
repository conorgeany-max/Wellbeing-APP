import { useEffect, useState } from 'react';
import { getSettings, useSettings } from '../db/settings';

// Client for the Netlify functions under /api. They only exist on the hosted
// app; locally (npm run dev) every call fails and the app stays fully offline.

export class CloudError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, code?: string): Promise<T> {
  const accessCode = code ?? (await getSettings()).accessCode;
  const res = await fetch(`./api/${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-steady-code': accessCode, ...(init.headers ?? {}) },
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson && res.status !== 204) throw new CloudError('Cloud features are only available on the hosted app.', 0);
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new CloudError(body?.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export interface CloudStatus {
  configured: boolean;
  authorized: boolean;
  ai: boolean;
  push: boolean;
}

/** null while checking or when there's no server (local dev, offline). */
export function useCloudStatus(): { status: CloudStatus | null; refresh: () => void } {
  const { accessCode } = useSettings();
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api<CloudStatus>('status', {}, accessCode)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus(null));
    return () => { cancelled = true; };
  }, [accessCode, tick]);
  return { status, refresh: () => setTick((t) => t + 1) };
}
