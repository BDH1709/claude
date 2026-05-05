import { NavLink } from 'react-router-dom'

const TABS = [
  { path: '/ptcg',             label: 'Meta',        icon: 'trending_up'  },
  { path: '/ptcg/decks',       label: 'My Decks',    icon: 'style'        },
  { path: '/ptcg/tournaments', label: 'Tournaments', icon: 'emoji_events' },
  { path: '/ptcg/catchup',     label: 'Catch Up',    icon: 'update'       },
]

export default function PTCGNav() {
  return (
    <nav className="flex gap-1 border-b border-white/8 px-4">
      {TABS.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/ptcg'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-3 font-label-sm border-b-2 transition-colors -mb-px ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
