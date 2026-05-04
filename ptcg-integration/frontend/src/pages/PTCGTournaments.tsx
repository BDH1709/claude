import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import AnimateIn from '../components/AnimateIn'
import {
  getPTCGTournaments, refreshPTCGTournaments,
  getPTCGTournamentDetail, PTCGTournament,
} from '../lib/ptcg'

function fmtDate(dateStr: string) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

interface Standing {
  name?: string
  player?: string
  archetype?: string
  deck_archetype?: string
  record?: string
}

export default function PTCGTournaments() {
  const [tournaments, setTournaments] = useState<PTCGTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, { standings: Standing[] }>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      setTournaments(await getPTCGTournaments())
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
      await refreshPTCGTournaments()
      await new Promise(r => setTimeout(r, 2000))
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const toggleExpand = async (id: string) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next && !details[next]) {
      setLoadingDetail(next)
      try {
        const d = await getPTCGTournamentDetail(next) as any
        setDetails(prev => ({ ...prev, [next]: d }))
      } catch { /* silent */ }
      finally { setLoadingDetail(null) }
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar showNav />
      <Sidebar variant="below-topbar" />
      <main className="ml-0 md:ml-64 pt-16 min-h-screen" role="main">
        <div className="max-w-4xl mx-auto px-4 py-8">

          <AnimateIn>
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">emoji_events</span>
                <h1 className="font-headline-lg text-on-surface">Recent Tournaments</h1>
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

          {error && (
            <AnimateIn>
              <div className="glass-panel border border-error/30 text-error font-body-md p-4 rounded-xl mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            </AnimateIn>
          )}

          {loading && (
            <div className="flex justify-center py-24">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading && tournaments.length === 0 && !error && (
            <AnimateIn>
              <div className="glass-panel text-center py-20 rounded-2xl">
                <span className="material-symbols-outlined text-5xl text-primary mb-4 block">emoji_events</span>
                <p className="font-body-lg text-on-surface-variant mb-6">No tournament data cached yet.</p>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRefresh}
                  className="glass-panel border border-primary/40 text-primary font-label-sm px-6 py-2.5 rounded-xl">
                  Fetch Tournaments
                </motion.button>
              </div>
            </AnimateIn>
          )}

          {!loading && tournaments.length > 0 && (
            <div className="space-y-2">
              {tournaments.map((t, i) => {
                const isOpen = expanded === t.id
                const d = details[t.id]
                const topDecks = Array.isArray(t.top_decks) ? t.top_decks.slice(0, 5) : []

                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`glass-card border transition-colors rounded-2xl overflow-hidden ${isOpen ? 'border-primary/30' : 'border-white/8 hover:border-white/15'}`}
                  >
                    <button
                      className="w-full text-left p-4"
                      onClick={() => toggleExpand(t.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-body-lg text-on-surface">{t.name || 'Unnamed Tournament'}</span>
                            {t.format && (
                              <span className="font-label-sm bg-secondary/10 text-secondary rounded-full px-2 py-0.5 capitalize">
                                {t.format}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 font-label-sm text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">calendar_today</span>
                              {fmtDate(t.date)}
                            </span>
                            {t.players > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">group</span>
                                {t.players}
                              </span>
                            )}
                            {t.country && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">public</span>
                                {t.country}
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          className="material-symbols-outlined text-on-surface-variant shrink-0"
                        >
                          expand_more
                        </motion.span>
                      </div>

                      {/* Top deck pills (collapsed) */}
                      {!isOpen && topDecks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {topDecks.map((deck, j) => (
                            <span key={j} className="font-label-sm bg-white/5 text-on-surface-variant rounded-full px-2.5 py-0.5">
                              {(deck as any).archetype || (deck as any).name || deck}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-white/5 pt-3">
                            {loadingDetail === t.id ? (
                              <div className="flex items-center gap-2 font-body-md text-on-surface-variant py-2">
                                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                Loading standings…
                              </div>
                            ) : d?.standings?.length ? (
                              <>
                                <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-3">Top Cut Standings</p>
                                <div className="space-y-1.5">
                                  {d.standings.slice(0, 16).map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
                                      <span className="font-mono text-on-surface-variant text-xs w-5 text-right shrink-0">#{idx + 1}</span>
                                      <span className="flex-1 font-body-md text-on-surface truncate">
                                        {entry.name || entry.player || `Player ${idx + 1}`}
                                      </span>
                                      <span className="font-label-sm text-primary truncate max-w-[140px]">
                                        {entry.archetype || entry.deck_archetype || ''}
                                      </span>
                                      {entry.record && (
                                        <span className="font-mono text-on-surface-variant text-xs shrink-0">{entry.record}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="font-body-md text-on-surface-variant py-2">No detailed standings available.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
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
