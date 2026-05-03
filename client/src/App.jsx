import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MyDecks from './pages/MyDecks';
import Tournaments from './pages/Tournaments';
import CatchUp from './pages/CatchUp';

const navItems = [
  { to: '/', label: 'Meta', icon: '⚡' },
  { to: '/decks', label: 'My Decks', icon: '🃏' },
  { to: '/tournaments', label: 'Tournaments', icon: '🏆' },
  { to: '/catchup', label: 'Catch Up', icon: '📋' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="bg-pokemon-card border-b border-pokemon-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎴</span>
              <span className="font-bold text-lg text-pokemon-yellow tracking-wide">
                PTCG Meta Tracker
              </span>
            </div>
            <nav className="flex gap-1">
              {navItems.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-pokemon-border text-pokemon-yellow'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/decks" element={<MyDecks />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/catchup" element={<CatchUp />} />
          </Routes>
        </main>

        <footer className="border-t border-pokemon-border text-center text-xs text-gray-500 py-3">
          Data from Limitless TCG · pokemontcg.io · Updates every 6h
        </footer>
      </div>
    </BrowserRouter>
  );
}
