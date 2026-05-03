import { useState } from 'react';
import axios from 'axios';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/Spinner';
import TierBadge from '../components/TierBadge';

const changeIcons = {
  new: { icon: '🆕', label: 'New to meta', color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  dropped: { icon: '📉', label: 'Dropped out', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  tier_change: { icon: '📊', label: 'Tier change', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
};

function ChangeCard({ change }) {
  const cfg = changeIcons[change.type] || changeIcons.new;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.color}`}>
      <span className="text-xl shrink-0">{cfg.icon}</span>
      <div>
        <div className="font-semibold text-white">{change.archetype}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {change.type === 'new' && `Appeared in meta as Tier ${change.tier}`}
          {change.type === 'dropped' && `Was Tier ${change.tier} — no longer in top results`}
          {change.type === 'tier_change' && (
            <span className="flex items-center gap-1.5">
              Moved from
              <TierBadge tier={change.from} />
              to
              <TierBadge tier={change.to} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaTable({ archetypes, title, highlight }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-300 mb-3">{title}</h3>
      <div className="space-y-1.5">
        {archetypes.slice(0, 10).map(a => (
          <div
            key={a.name}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              highlight?.includes(a.name) ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-white/5'
            }`}
          >
            <TierBadge tier={a.tier} />
            <span className="flex-1 text-white font-medium">{a.name}</span>
            <span className="text-gray-400 text-xs">{a.top8s} top-8</span>
            <span className="text-gray-500 text-xs">avg #{a.avg_placement}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CatchUp() {
  const { data, loading, error, refetch } = useApi('/api/meta/catchup');
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

  if (loading) return <Spinner text="Building your catch-up..." />;
  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-4">Error: {error}</p>
      <button className="btn-primary" onClick={handleRefresh}>Retry</button>
    </div>
  );

  const changes = data?.changes || [];
  const current = data?.current || [];
  const previous = data?.previous || [];
  const snapshotDate = data?.snapshot_date;
  const updatedAt = data?.updated_at;

  const changedNames = changes.map(c => c.archetype);

  const weeksSince = snapshotDate
    ? Math.round((Date.now() - new Date(snapshotDate)) / (7 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Catch Up</h1>
          <p className="text-gray-400 text-sm mt-1">
            {snapshotDate
              ? `What changed in the last ${weeksSince === 1 ? '1 week' : `${weeksSince || '?'} weeks`} — comparing snapshots`
              : "Here's the current meta. No previous snapshot yet — check back after next refresh."}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm shrink-0"
        >
          {refreshing ? (
            <><div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" /> Refreshing...</>
          ) : (
            <><span>↻</span> Refresh</>
          )}
        </button>
      </div>

      {/* Summary banner */}
      <div className="card bg-gradient-to-r from-pokemon-blue/20 to-pokemon-card border-pokemon-blue/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-pokemon-yellow">{current.length}</div>
            <div className="text-xs text-gray-400 mt-1">Active Archetypes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {changes.filter(c => c.type === 'new').length}
            </div>
            <div className="text-xs text-gray-400 mt-1">New Entrants</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {changes.filter(c => c.type === 'tier_change').length}
            </div>
            <div className="text-xs text-gray-400 mt-1">Tier Shifts</div>
          </div>
        </div>
      </div>

      {/* What changed */}
      {changes.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">
            ⚡ What Changed
            {snapshotDate && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                since {new Date(snapshotDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {changes.map((change, i) => (
              <ChangeCard key={i} change={change} />
            ))}
          </div>
        </section>
      ) : (
        <div className="card text-center text-gray-400 py-8">
          {snapshotDate
            ? '✅ Meta is stable — no significant changes since your last check-in'
            : '📸 No previous snapshot to compare yet. Refresh again in 2 weeks to see changes.'}
        </div>
      )}

      {/* Side-by-side comparison */}
      {previous.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">📊 Meta Comparison</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <MetaTable
              archetypes={current}
              title={`Current (${updatedAt ? new Date(updatedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : 'now'})`}
              highlight={changedNames}
            />
            <MetaTable
              archetypes={previous}
              title={`Previous (${snapshotDate ? new Date(snapshotDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '2 weeks ago'})`}
            />
          </div>
        </section>
      )}

      {/* Current meta if no comparison */}
      {previous.length === 0 && current.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">📊 Current Meta</h2>
          <MetaTable archetypes={current} title="Top Archetypes Right Now" />
        </section>
      )}

      {current.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">📋</p>
          <p className="mb-4">No meta data yet. Fetch the latest data first.</p>
          <button className="btn-primary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Fetching...' : 'Fetch Meta Data'}
          </button>
        </div>
      )}
    </div>
  );
}
