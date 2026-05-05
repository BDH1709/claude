import { useState } from 'react';
import axios from 'axios';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/Spinner';
import TierBadge from '../components/TierBadge';

const TIERS = ['S', 'A', 'B', 'C'];

const tierLabels = {
  S: 'S Tier — Dominant',
  A: 'A Tier — Strong',
  B: 'B Tier — Solid',
  C: 'C Tier — Fringe',
};

function ArchetypeCard({ archetype, expanded, onToggle }) {
  return (
    <div className="card cursor-pointer hover:border-pokemon-yellow/50 transition-colors" onClick={onToggle}>
      <div className="flex items-center gap-3">
        <TierBadge tier={archetype.tier} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{archetype.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {archetype.top8s} top-8 · avg placement #{archetype.avg_placement} · {archetype.wins} win{archetype.wins !== 1 ? 's' : ''}
          </div>
        </div>
        <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && archetype.example_decklist && (
        <div className="mt-4 pt-4 border-t border-pokemon-border">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Example Decklist</div>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(
              (archetype.example_decklist || []).reduce((acc, card) => {
                acc[card.name || card] = (acc[card.name || card] || 0) + (card.count || 1);
                return acc;
              }, {})
            ).map(([name, count]) => (
              <div key={name} className="text-xs text-gray-300 flex justify-between gap-2 bg-white/5 rounded px-2 py-1">
                <span className="truncate">{name}</span>
                <span className="text-pokemon-yellow font-mono">×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useApi('/api/meta');
  const [expanded, setExpanded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/meta/refresh');
      await refetch();
    } catch (e) {
      alert('Refresh failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <Spinner text="Loading meta data..." />;
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">Failed to load meta data: {error}</p>
      <button className="btn-primary" onClick={handleRefresh}>Fetch Meta Data</button>
    </div>
  );

  const archetypes = data?.archetypes || [];
  const updatedAt = data?.updated_at ? new Date(data.updated_at).toLocaleString() : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Meta Overview</h1>
          {updatedAt && <p className="text-xs text-gray-500 mt-1">Last updated: {updatedAt}</p>}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          {refreshing ? (
            <><div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" /> Refreshing...</>
          ) : (
            <><span>↻</span> Refresh Meta</>
          )}
        </button>
      </div>

      {archetypes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🎴</p>
          <p className="mb-4">No meta data yet. Click Refresh Meta to fetch the latest tournament data.</p>
          <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Fetching...' : 'Fetch Meta Data'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {TIERS.map(tier => {
            const group = archetypes.filter(a => a.tier === tier);
            if (group.length === 0) return null;
            return (
              <section key={tier}>
                <div className="flex items-center gap-3 mb-3">
                  <TierBadge tier={tier} />
                  <h2 className="font-semibold text-gray-300">{tierLabels[tier]}</h2>
                  <span className="text-xs text-gray-500">({group.length} deck{group.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map(a => (
                    <ArchetypeCard
                      key={a.name}
                      archetype={a}
                      expanded={expanded === a.name}
                      onToggle={() => setExpanded(expanded === a.name ? null : a.name)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
