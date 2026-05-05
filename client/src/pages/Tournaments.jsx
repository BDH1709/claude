import { useState } from 'react';
import axios from 'axios';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/Spinner';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function TopDeckBadge({ deck }) {
  return (
    <span className="inline-block bg-white/5 text-xs text-gray-300 rounded-full px-2 py-0.5">
      {deck.archetype || deck.name || deck}
    </span>
  );
}

export default function Tournaments() {
  const { data: tournaments, loading, error, refetch } = useApi('/api/tournaments');
  const [expanded, setExpanded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/tournaments/refresh');
      await refetch();
    } catch (e) {
      alert('Refresh failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setRefreshing(false);
    }
  };

  const loadDetail = async (id) => {
    if (detail[id] || loadingDetail === id) return;
    setLoadingDetail(id);
    try {
      const { data } = await axios.get(`/api/tournaments/${id}`);
      setDetail(prev => ({ ...prev, [id]: data }));
    } catch { /* silent */ }
    finally { setLoadingDetail(null); }
  };

  const toggle = (id) => {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next) loadDetail(next);
  };

  if (loading) return <Spinner text="Loading tournaments..." />;
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">Failed to load tournaments: {error}</p>
      <button className="btn-primary" onClick={handleRefresh}>Fetch Tournaments</button>
    </div>
  );

  const list = Array.isArray(tournaments) ? tournaments : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Recent Tournaments</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          {refreshing ? (
            <><div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" /> Refreshing...</>
          ) : (
            <><span>↻</span> Refresh</>
          )}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🏆</p>
          <p className="mb-4">No tournament data cached. Click Refresh to fetch.</p>
          <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Fetching...' : 'Fetch Tournaments'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(t => {
            const isOpen = expanded === t.id;
            const d = detail[t.id];
            const topDecks = Array.isArray(t.top_decks) ? t.top_decks : [];

            return (
              <div key={t.id} className="card">
                <button
                  className="w-full text-left"
                  onClick={() => toggle(t.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{t.name || 'Unnamed Tournament'}</span>
                        {t.format && (
                          <span className="text-xs bg-pokemon-blue/30 text-blue-300 rounded px-1.5 py-0.5 capitalize">{t.format}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                        <span>📅 {formatDate(t.date)}</span>
                        {t.players > 0 && <span>👥 {t.players} players</span>}
                        {t.country && <span>🌍 {t.country}</span>}
                      </div>
                    </div>
                    <span className="text-gray-500 text-sm shrink-0">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {topDecks.length > 0 && !isOpen && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {topDecks.slice(0, 5).map((deck, i) => (
                        <TopDeckBadge key={i} deck={deck} />
                      ))}
                    </div>
                  )}
                </button>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-pokemon-border">
                    {loadingDetail === t.id ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                        Loading standings...
                      </div>
                    ) : d?.standings ? (
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Cut Standings</div>
                        <div className="space-y-1">
                          {d.standings.slice(0, 16).map((entry, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm bg-white/5 rounded px-3 py-1.5">
                              <span className="w-6 text-center font-mono text-gray-400 text-xs">#{i + 1}</span>
                              <span className="flex-1 text-white">{entry.name || entry.player || `Player ${i + 1}`}</span>
                              <span className="text-pokemon-yellow text-xs">{entry.archetype || entry.deck_archetype || ''}</span>
                              {entry.record && <span className="text-gray-400 text-xs font-mono">{entry.record}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No detailed standings available.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
