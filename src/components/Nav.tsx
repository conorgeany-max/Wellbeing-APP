import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Today', icon: '◐', end: true },
  { to: '/journal', label: 'Journal', icon: '✎' },
  { to: '/habits', label: 'Habits', icon: '◎' },
  { to: '/strengths', label: 'Strengths', icon: '✦', desktopOnly: true },
  { to: '/quotes', label: 'Quotes', icon: '❝', desktopOnly: true },
  { to: '/insights', label: 'Insights', icon: '↗' },
  { to: '/settings', label: 'Settings', icon: '⚙', desktopOnly: true },
  { to: '/more', label: 'More', icon: '⋯', mobileOnly: true },
];

const cls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition ${isActive ? 'bg-sage/15 text-ink font-medium' : 'text-muted hover:text-ink hover:bg-sand'}`;

export function SideNav() {
  return (
    <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-line/60 px-4 py-8 md:flex">
      <p className="headline mb-6 px-4 text-2xl">Steady</p>
      {ITEMS.filter((i) => !i.mobileOnly).map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={cls}>
          <span className="w-4 text-center" aria-hidden>{i.icon}</span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function BottomNav() {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line/60 bg-bg/90 px-2 pt-2 backdrop-blur md:hidden">
      {ITEMS.filter((i) => !i.desktopOnly).map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          className={({ isActive }) => `flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] ${isActive ? 'text-sage' : 'text-muted'}`}
        >
          <span className="text-lg leading-none" aria-hidden>{i.icon}</span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
