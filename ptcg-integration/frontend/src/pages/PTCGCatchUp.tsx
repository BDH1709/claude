import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import AnimateIn from '../components/AnimateIn'
import PTCGNav from '../components/PTCGNav'
import { staggerContainer, staggerItem } from '../animations'
import { getPTCGCatchUp, refreshPTCGMeta, PTCGCatchUpResponse, PTCGArchetype, PTCGChange } from '../lib/ptcg'

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

const TIER_TEXT: Record<string, string> = { S: 'text-error', A: 'text-secondary', B: 'text-primary', C: 'text-tertiary' }
const TIER_BORDER: Record<string, string> = { S: 'border-error/40', A: 'border-secondary/40', B: 'border-primary/40', C: 'border-tertiary/30' }
const TIER_BG: Record<string, string> = { S: 'bg-error/10', A: 'bg-secondary/10', B: 'bg-primary/10', C: 'bg-tertiary/5' }

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-mono font-bold shrink-0
      ${TIER_TEXT[tier] ?? 'text-tertiary'} ${TIER_BORDER[tier] ?? 'border-tertiary/30'} ${TIER_BG[tier] ?? 'bg-tertiary/5'}`}>
      {tier}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Change card
// ---------------------------------------------------------------------------

const CHANGE_CONFIG = {
  new: {
    icon: 'new_releases',
    iconColor: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    label: (c: PTCGChange) => `Entered meta as Tier ${c.tier}`,
  },
  dropped: {
    icon: 'trending_down',
    iconColor: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/30',
    label: (c: PTCGChange) => `Dropped out — was Tier ${c.tier}`,
  },
  tier_change: {
    icon: 'swap_vert',
    iconColor: 'text-[#FFCB8A]',
    bg: 'bg-[#FFCB8A]/10',
    border: 'border-[#FFCB8A]/30',
    label: () => '',
  },
}

function ChangeCard({ change, index }: { change: PTCGChange; index: number }) {
  const cfg = CHANGE_CONFIG[change.type] ?? CHANGE_CONFIG.new
  const isUp = change.type === 'tier_change' && ['S', 'A'].includes(change.to_tier ?? '')
    && ['B', 'C'].includes(change.from_tier ?? '')

  return (
    <motion.div
      variants={staggerItem}
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}
    >
      <span className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${cfg.iconColor}`}>{cfg.icon}</span>
      <div className="min-w-0">
        <p className="font-body-md text-on-surface">{change.archetype}</p>
        <div className="mt-0.5">
          {change.type === 'tier_change' ? (
            <span className="flex items-center gap-1.5 font-label-sm text-on-surface-variant">
              Tier changed
              <TierBadge tier={change.from_tier!} />
              <span className={`material-symbols-outlined text-sm ${isUp ? 'text-primary' : 'text-error'}`}>
                {isUp ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <TierBadge tier={change.to_tier!} />
            </span>
          ) : (
            <p className="font-label-sm text-on-surface-variant">{cfg.label(change)}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Mini archetype row
// ---------------------------------------------------------------------------

function ArchetypeRow({ archetype, highlighted }: { archetype: PTCGArchetype; highlighted: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 font-label-sm transition-colors
      ${highlighted ? 'bg-[#FFCB8A]/10 border border-[#FFCB8A]/20' : 'bg-white/5'}`}>
      <TierBadge tier={archetype.tier} />
      <span className="flex-1 font-body-md text-on-surface truncate">{archetype.name}</span>
      <span className="text-on-surface-variant shrink-0">{archetype.top8s} top-8</span>
      <span className="text-on-surface-variant font-mono shrink-0">#{archetype.avg_placement}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="glass-card border border-white/8 rounded-2xl p-4 text-center">
      <motion.p
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`font-headline-lg text-3xl ${color}`}
      >
        {value}
      </motion.p>
      <p className="font-label-sm text-on-surface-variant mt-1">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PTCGCatchUp() {
  const [data, setData] = useState<PTCGCatchUpResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      setData(await getPTCGCatchUp())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshPTCGMeta()
      await new Promise(r => setTimeout(r, 3000))
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const current = data?.current ?? []
  const previous = data?.previous ?? []
  const changes = data?.changes ?? []
  const changedNames = new Set(changes.map(c => c.archetype))

  const weeksSince = data?.snapshot_date
    ? Math.round((Date.now() - new Date(data.snapshot_date).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null

  const snapshotLabel = data?.snapshot_date
    ? new Date(data.snapshot_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  const updatedLabel = data?.updated_at
    ? new Date(data.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : 'now'

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar showNav />
      <Sidebar variant="below-topbar" />
      <main className="ml-0 md:ml-64 pt-16 min-h-screen" role="main">
        <PTCGNav />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

          {/* Header */}
          <AnimateIn>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary">update</span>
                  <h1 className="font-headline-lg text-on-surface">Catch Up</h1>
                </div>
                <p className="font-body-md text-on-surface-variant">
                  {weeksSince != null
                    ? `What shifted in the last ${weeksSince === 1 ? '1 week' : `${weeksSince} weeks`}`
                    : 'Your bi-weekly meta digest'}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="glass-panel border border-primary/30 text-primary font-label-sm px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </motion.button>
            </div>
          </AnimateIn>

          {/* Error */}
          {error && (
            <AnimateIn>
              <div className="glass-panel border border-error/30 text-error font-body-md p-4 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            </AnimateIn>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="font-body-md text-on-surface-variant">Building your digest…</p>
            </div>
          )}

          {!loading && current.length === 0 && (
            <AnimateIn>
              <div className="glass-panel text-center py-20 rounded-2xl">
                <span className="material-symbols-outlined text-5xl text-primary mb-4 block">update</span>
                <p className="font-body-lg text-on-surface-variant mb-6">No meta data yet. Fetch latest results first.</p>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={handleRefresh}
                  className="glass-panel border border-primary/40 text-primary font-label-sm px-6 py-2.5 rounded-xl">
                  {refreshing ? 'Fetching…' : 'Fetch Meta Data'}
                </motion.button>
              </div>
            </AnimateIn>
          )}

          {!loading && current.length > 0 && (
            <>
              {/* Stats summary */}
              <AnimateIn>
                <div className="grid grid-cols-3 gap-3">
                  <StatPill value={current.length} label="Active archetypes" color="text-secondary" />
                  <StatPill value={changes.filter(c => c.type === 'new').length} label="New entrants" color="text-primary" />
                  <StatPill value={changes.filter(c => c.type === 'tier_change').length} label="Tier shifts" color="text-[#FFCB8A]" />
                </div>
              </AnimateIn>

              {/* What changed */}
              {changes.length > 0 ? (
                <AnimateIn>
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-primary">bolt</span>
                      <h2 className="font-headline-md text-on-surface">What Changed</h2>
                      {snapshotLabel && (
                        <span className="font-label-sm text-on-surface-variant ml-1">since {snapshotLabel}</span>
                      )}
                    </div>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {changes.map((change, i) => (
                        <ChangeCard key={i} change={change} index={i} />
                      ))}
                    </motion.div>
                  </section>
                </AnimateIn>
              ) : (
                <AnimateIn>
                  <div className="glass-panel border border-primary/20 rounded-2xl p-5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
                    <p className="font-body-md text-on-surface-variant">
                      {data?.snapshot_date
                        ? 'Meta is stable — no significant changes since your last check-in.'
                        : 'No previous snapshot yet. Check back after another refresh in 2 weeks.'}
                    </p>
                  </div>
                </AnimateIn>
              )}

              {/* Side-by-side comparison */}
              {previous.length > 0 && (
                <AnimateIn>
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-primary">compare</span>
                      <h2 className="font-headline-md text-on-surface">Meta Comparison</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      {/* Current */}
                      <div>
                        <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-3">
                          Current · {updatedLabel}
                        </p>
                        <div className="space-y-1.5">
                          {current.slice(0, 10).map(a => (
                            <ArchetypeRow key={a.name} archetype={a} highlighted={changedNames.has(a.name)} />
                          ))}
                        </div>
                      </div>
                      {/* Previous */}
                      <div>
                        <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-3">
                          Previous · {snapshotLabel ?? '2 weeks ago'}
                        </p>
                        <div className="space-y-1.5">
                          {previous.slice(0, 10).map(a => (
                            <ArchetypeRow key={a.name} archetype={a} highlighted={false} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </AnimateIn>
              )}

              {/* Current only (no previous snapshot) */}
              {previous.length === 0 && (
                <AnimateIn>
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-primary">bar_chart</span>
                      <h2 className="font-headline-md text-on-surface">Current Meta</h2>
                    </div>
                    <div className="space-y-1.5">
                      {current.slice(0, 12).map(a => (
                        <ArchetypeRow key={a.name} archetype={a} highlighted={false} />
                      ))}
                    </div>
                  </section>
                </AnimateIn>
              )}
            </>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
