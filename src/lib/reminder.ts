import { useEffect } from 'react';
import { db } from '../db/db';
import { today } from './date';

const KEY = 'steady:lastReminder';

/**
 * Gentle daily reminder. Browsers only let a web app notify while it is open
 * (or installed and recently used), so this checks once a minute.
 */
export function useDailyReminder(time: string | null) {
  useEffect(() => {
    if (!time || typeof Notification === 'undefined') return;
    const check = async () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      let last: string | null = null;
      try { last = localStorage.getItem(KEY); } catch { /* storage blocked */ }
      if (hhmm < time || last === today() || Notification.permission !== 'granted') return;
      const done = await db.entries.where('date').equals(today()).count();
      try { localStorage.setItem(KEY, today()); } catch { /* ignore */ }
      if (!done) new Notification('Steady', { body: 'A few quiet minutes for your check-in?', icon: './icon-192.png' });
    };
    void check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [time]);
}
