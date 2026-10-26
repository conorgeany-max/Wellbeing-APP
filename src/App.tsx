import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav, SideNav } from './components/Nav';
import { useSettings } from './db/settings';
import { ensureSeeded } from './db/seed';
import { useApplyTheme } from './lib/theme';
import { useDailyReminder } from './lib/reminder';
import Today from './screens/Today';
import CheckIn from './screens/CheckIn';
import Journal from './screens/Journal';
import JournalEntry from './screens/JournalEntry';
import Habits from './screens/Habits';
import Quotes from './screens/Quotes';
import Strengths from './screens/Strengths';
import Settings from './screens/Settings';
import More from './screens/More';

// Charts are the heaviest part of the bundle, so Insights loads on demand.
const Insights = lazy(() => import('./screens/Insights'));

function Shell() {
  const { pathname } = useLocation();
  const immersive = pathname.startsWith('/checkin');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen">
      {!immersive && <SideNav />}
      <div className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/:date" element={<JournalEntry />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/strengths" element={<Strengths />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
          </Routes>
        </Suspense>
      </div>
      {!immersive && <BottomNav />}
    </div>
  );
}

export default function App() {
  const settings = useSettings();
  const [ready, setReady] = useState(false);
  useApplyTheme(settings.theme);
  useDailyReminder(settings.reminderTime);
  useEffect(() => {
    ensureSeeded().finally(() => setReady(true));
  }, []);
  if (!ready) return <div className="flex min-h-screen items-center justify-center"><p className="headline text-2xl text-muted">Steady</p></div>;
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
