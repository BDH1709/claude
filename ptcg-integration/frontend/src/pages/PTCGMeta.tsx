import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import AnimateIn from '../components/AnimateIn'
import PTCGNav from '../components/PTCGNav'
import { getPTCGMeta, refreshPTCGMeta, PTCGArchetype, PTCGMetaResponse } from '../lib/ptcg'

const TIERS = ['S', 'A', 'B', 'C'] as const

const TIER_CONFIG = {
  S: {
    label: 'S Tier',
    sub: 'Dominant',
    border: 'border-error/40',
    bg: 'bg-error/10',
    text: 'text-error',
    glow: 'shadow-[0_0_18px_rgba(255,180,171,0.15)]',
  },
  A: {
    label: 'A Tier',
    sub: 'Strong',
    border: 'border-secondary/40',
    bg: 'bg-secondary/10',
    text: 'text-secondary',
    glow: 'shadow-[0_0_18px_rgba(170,200,252,0.12)]',
  },
  B: {
    label: 'B Tier',
    sub: 'Solid',
    border: 'border-primary/40',
    bg: 'bg-primary/10',
    text: 'text-primary',
    glow: 'shadow-[0_0_18px_rgba(183,204,185,0.12)]',
  },
  C: {
    label: 'C Tier',
    sub: 'Fringe',
    border: 'border-tertiary/30',
    bg: 'bg-tertiary/5',
    text: 'text-tertiary',
    glow: '',
  },
}

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.C
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-2 font-headline-md text-sm shrink-0 ${cfg.border} ${cfg.bg} ${cfg.text}`}
    >
      {tier}
    </span>
  )
}

function ArchetypeCard({ archetype, index }: { archetype: PTCGArchetype; index: number }) {
  const [open, setOpen] = useState(false)
  const cfg = TIER_CONFIG[archetype.tier] ?? TIER_CONFIG.C

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      whileHover={{ y: -4, scale: 1.012 }}
      className={`glass-card border cursor-pointer transition-colors ${cfg.border} ${cfg.glow}`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="p-4 flex items-center gap-3">
        <TierBadge tier={archetype.tier} />
        <div className="flex-1 min-w-0">
          <p className="font-body-lg text-on-surface truncate">{archetype.name}</p>
          <p className="font-label-sm text-on-surface-variant mt-0.5">
            {archetype.top8s} top-8 · avg #{archetype.avg_placement} · {archetype.wins} win{archetype.wins !== 1 ? 's' : ''}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="material-symbols-outlined text-on-surface-variant text-lg shrink-0"
        >
          expand_more
        </motion.span>
      </div>

      <AnimatePresence>
        {open && archetype.example_decklist && archetype.example_decklist.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
                Example Decklist
              </p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(
                  archetype.example_decklist.reduce<Record<string, number>>((acc, card) => {
                    const name = typeof card === 'string' ? card : card.name
                    acc[name] = (acc[name] ?? 0) + (typeof card === 'object' ? card.count ?? 1 : 1)
                    return acc
                  }, {})
                ).map(([name, count]) => (
                  <div
                    key={name}
                    className="flex justify-between gap-2 bg-white/5 rounded-lg px-2 py-1 font-label-sm"
                  >
                    <span className="text-on-surface-variant truncate">{name}</span>
                    <span className={`${cfg.text} font-mono shrink-0`}>×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function PTCGMeta() {
  const [data, setData] = useState<PTCGMetaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const res = await getPTCGMeta()
      setData(res)
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
      // Poll until data updates (background task)
      await new Promise(r => setTimeout(r, 3000))
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const archetypes = data?.archetypes ?? []
  const updatedAt = data?.updated_at ? new Date(data.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar showNav />
      <Sidebar variant="below-topbar" />
      <main className="ml-0 md:ml-64 pt-16 min-h-screen" role="main">
        <PTCGNav />
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <AnimateIn>
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary">trending_up</span>
                  <h1 className="font-headline-lg text-on-surface">Meta Overview</h1>
                </div>
                {updatedAt && (
                  <p className="font-label-sm text-on-surface-variant">Last updated: {updatedAt}</p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="glass-panel border border-primary/30 text-primary font-label-sm px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${refreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {refreshing ? 'Refreshing…' : 'Refresh Meta'}
              </motion.button>
            </div>
          </AnimateIn>

          {/* Error */}
          {error && (
            <AnimateIn>
              <div className="glass-panel border border-error/30 text-error font-body-md p-4 rounded-xl mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            </AnimateIn>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="font-body-md text-on-surface-variant">Loading meta data…</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && archetypes.length === 0 && (
            <AnimateIn>
              <div className="glass-panel text-center py-20 rounded-2xl">
                <span className="material-symbols-outlined text-5xl text-primary mb-4 block">style</span>
                <p className="font-body-lg text-on-surface-variant mb-6">No meta data yet. Fetch the latest tournament results.</p>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="glass-panel border border-primary/40 text-primary font-label-sm px-6 py-2.5 rounded-xl"
                >
                  {refreshing ? 'Fetching…' : 'Fetch Meta Data'}
                </motion.button>
              </div>
            </AnimateIn>
          )}

          {/* Tier groups */}
          {!loading && archetypes.length > 0 && (
            <div className="space-y-10">
              {TIERS.map(tier => {
                const group = archetypes.filter(a => a.tier === tier)
                if (group.length === 0) return null
                const cfg = TIER_CONFIG[tier]
                return (
                  <AnimateIn key={tier}>
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <TierBadge tier={tier} />
                        <div>
                          <span className={`font-headline-md ${cfg.text}`}>{cfg.label}</span>
                          <span className="font-label-sm text-on-surface-variant ml-2">— {cfg.sub}</span>
                        </div>
                        <span className="font-label-sm text-on-surface-variant ml-auto">
                          {group.length} deck{group.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {group.map((a, i) => (
                          <ArchetypeCard key={a.name} archetype={a} index={i} />
                        ))}
                      </div>
                    </section>
                  </AnimateIn>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
