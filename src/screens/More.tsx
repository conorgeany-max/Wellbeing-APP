import { Link } from 'react-router-dom';
import { Page } from '../components/ui';
import { SupportLink } from '../components/Support';

const LINKS = [
  { to: '/strengths', icon: '✦', title: 'Strengths', sub: 'Your VIA profile, for reference' },
  { to: '/report', icon: '☾', title: 'Monthly reflection', sub: 'Your month in review' },
  { to: '/quotes', icon: '❝', title: 'Quotes', sub: 'Quote of the day, favourites and your own' },
  { to: '/settings', icon: '⚙', title: 'Settings', sub: 'Theme, reminders, data and support' },
];

export default function More() {
  return (
    <Page eyebrow="Steady" title="More">
      <ul className="space-y-3">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="card flex items-center gap-4 p-5">
              <span className="text-2xl text-accent" aria-hidden>{l.icon}</span>
              <span><span className="headline block text-xl">{l.title}</span><span className="text-sm text-muted">{l.sub}</span></span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center"><SupportLink /></div>
    </Page>
  );
}
