// Core data model. Every record has a string id and updatedAt so it can
// later sync to a backend (e.g. Supabase) without a schema change.

export type ISODate = string; // 'YYYY-MM-DD' in local time

export interface Entry {
  id: string;
  date: ISODate; // one check-in per day
  mood: number; // 1-5
  energy: number; // 1-5
  sleepHours: number;
  text: string; // free-write journal ("Clear" step)
  reflection: string; // answer to the Reflect prompt
  tags: string[];
  strengthsUsed: string[]; // Strength ids
  sample?: boolean; // part of the toggleable demo data
  createdAt: number;
  updatedAt: number;
}

export type HabitFrequency = { type: 'daily' } | { type: 'weekly'; times: number };

export interface Habit {
  id: string;
  name: string;
  icon: string; // emoji
  frequency: HabitFrequency;
  archived: boolean;
  strength?: string; // Strength id this habit builds
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface HabitLog {
  id: string; // `${habitId}:${date}`
  habitId: string;
  date: ISODate;
  done: boolean;
  sample?: boolean;
  updatedAt: number;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  favourite: boolean;
  custom: boolean;
  strength?: string;
  updatedAt: number;
}

export type Virtue = 'Wisdom' | 'Courage' | 'Humanity' | 'Justice' | 'Temperance' | 'Transcendence';

export interface Strength {
  id: string; // slug, e.g. 'curiosity'
  rank: number; // 1-24, editable in Settings
  name: string;
  virtue: Virtue;
  description: string;
  useIdea: string; // "use it today" idea
  prompt: string; // journal prompt
  challenges: string[]; // tiny daily challenges for Strength of the week
  lowMoodAction?: string; // gentle action suggested on a low check-in
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}
