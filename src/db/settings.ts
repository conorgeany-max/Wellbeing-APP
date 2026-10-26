import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface StrengthOfWeek {
  strengthId: string;
  weekStart: string;
}

export interface Settings {
  theme: ThemeMode;
  reminderTime: string | null; // 'HH:MM'
  country: string;
  sampleData: boolean;
  strengthOfWeek: StrengthOfWeek | null;
  name: string;
  seeded: boolean;
  // Cloud features (only on the hosted app)
  accessCode: string;
  useClaude: boolean;
  lastSync: number | null;
  pushEnabled: boolean;
}

/** Settings that follow you between devices. Everything else stays on this device. */
export const SYNCED_SETTINGS: (keyof Settings)[] = ['name', 'country', 'strengthOfWeek'];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reminderTime: null,
  country: 'UK',
  sampleData: true,
  strengthOfWeek: null,
  name: '',
  seeded: false,
  accessCode: '',
  useClaude: false,
  lastSync: null,
  pushEnabled: false,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as unknown as Settings;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return db.settings.put(SYNCED_SETTINGS.includes(key) ? { key, value, updatedAt: Date.now() } : { key, value });
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}
