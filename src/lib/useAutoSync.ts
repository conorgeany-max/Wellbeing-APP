import { useEffect } from 'react';
import { syncNow, watchLocalChanges } from './sync';

/** Keep this device in sync: on open, when it comes back into view, every few minutes and after edits. */
export function useAutoSync(accessCode: string) {
  useEffect(() => {
    if (!accessCode) return;
    const run = () => { syncNow().catch(() => undefined); };
    watchLocalChanges();
    run();
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(run, 5 * 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [accessCode]);
}
