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
  askEndpoint: string; // optional AI backend for "Ask my journal"
  seeded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reminderTime: null,
  country: 'UK',
  sampleData: true,
  strengthOfWeek: null,
  name: '',
  askEndpoint: '',
  seeded: false,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as unknown as Settings;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return db.settings.put({ key, value });
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}
