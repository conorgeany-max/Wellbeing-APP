import Dexie, { type Table } from 'dexie';
import type { Entry, Habit, HabitLog, Quote, Setting, Strength } from './types';

class SteadyDB extends Dexie {
  entries!: Table<Entry, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  quotes!: Table<Quote, string>;
  strengths!: Table<Strength, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('steady');
    this.version(1).stores({
      entries: 'id, &date, mood, *tags, *strengthsUsed, sample, updatedAt',
      habits: 'id, archived, order, updatedAt',
      habitLogs: 'id, habitId, date, [habitId+date], sample, updatedAt',
      quotes: 'id, favourite, custom, strength, updatedAt',
      strengths: 'id, rank',
      settings: 'key',
    });
  }
}

export const db = new SteadyDB();
