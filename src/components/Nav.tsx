import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Today', icon: '◐', end: true },
  { to: '/journal', label: 'Journal', icon: '✎' },
  { to: '/habits', label: 'Habits', icon: '◎' },
  { to: '/strengths', label: 'Strengths', icon: '✦', desktopOnly: true },
  { to: '/quotes', label: 'Quotes', icon: '❝', desktopOnly: true },
  { to: '/insights', label: 'Insights', icon: '↗' },
  { to: '/more', label: 'More', icon: '⋯', mobileOnly: true },
];

export function Logo({ className = '' }: { className?: string }) {
  return <span className={`font-script text-3xl leading-none text-accent ${className}`}>Steady</span>;
}

/** Desktop: script logo left, a white box of caps links in the middle, settings tile on the right. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 hidden items-start justify-between px-6 pt-4 md:flex">
      <NavLink to="/" aria-label="Steady home" className="-rotate-6 transition hover:rotate-0"><Logo className="text-4xl" /></NavLink>
      <nav className="flex gap-1 bg-card px-2.5 lg:gap-2">
        {ITEMS.filter((i) => !i.mobileOnly).map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) => `eyebrow flex items-center px-2.5 py-3 text-[12px] transition ${isActive ? '!text-ink' : '!text-ink/70 hover:!text-ink'}`}
          >
            {({ isActive }) => <span className={isActive ? 'squiggle' : ''}>{i.label}</span>}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/settings" className="eyebrow flex items-center gap-2 bg-card px-4 py-3 text-[12px] !text-ink">
        {({ isActive }) => (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            <span className={isActive ? 'squiggle' : ''}>Settings</span>
          </>
        )}
      </NavLink>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="pb-safe px-safe fixed inset-x-0 bottom-0 z-40 flex justify-around bg-card pt-1 md:hidden">
      {ITEMS.filter((i) => !i.desktopOnly).map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          className={({ isActive }) => `flex min-w-[56px] flex-col items-center gap-1 px-2 py-2 ${isActive ? 'text-accent' : 'text-ink/60'}`}
        >
          {({ isActive }) => (
            <>
              <span className="text-lg leading-none" aria-hidden>{i.icon}</span>
              <span className={`eyebrow text-[10px] !text-current ${isActive ? 'squiggle' : ''}`}>{i.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
