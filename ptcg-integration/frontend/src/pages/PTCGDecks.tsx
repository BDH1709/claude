import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import AnimateIn from '../components/AnimateIn'
import PTCGNav from '../components/PTCGNav'
import {
  getPTCGDecks, createPTCGDeck, updatePTCGDeck,
  deletePTCGDeck, markPTCGDeckPlayed, searchPTCGCards,
  PTCGDeck, PTCGCard,
} from '../lib/ptcg'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: 'Never played', color: 'text-on-surface-variant' }
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return { label: 'Played today', color: 'text-primary' }
  if (diff === 1) return { label: 'Yesterday', color: 'text-primary' }
  if (diff <= 7) return { label: `${diff}d ago`, color: 'text-secondary' }
  if (diff <= 14) return { label: `${diff}d ago`, color: 'text-[#FFCB8A]' }
  return { label: `${diff}d ago`, color: 'text-error' }
}

// ---------------------------------------------------------------------------
// Card search input
// ---------------------------------------------------------------------------

function CardSearchInput({ onSelect }: { onSelect: (card: PTCGCard) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PTCGCard[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (!query.trim()) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchPTCGCards(query)
        setResults(res.data ?? [])
        setOpen(true)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }, [query])

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">
          search
        </span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search cards to add…"
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 font-body-md text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full glass-panel border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto"
          >
            {results.map(card => (
              <button
                key={card.id}
                onClick={() => { onSelect(card); setQuery(''); setOpen(false); setResults([]) }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
              >
                {card.images?.small && (
                  <img src={card.images.small} alt={card.name} className="w-8 h-11 object-cover rounded shrink-0" />
                )}
                <div>
                  <p className="font-body-md text-on-surface">{card.name}</p>
                  <p className="font-label-sm text-on-surface-variant">{card.set?.name} · {card.number}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deck modal
// ---------------------------------------------------------------------------

type DeckCardEntry = { id: string; name: string; image: string; count: number }

interface DeckModalProps {
  deck: PTCGDeck | null
  onClose: () => void
  onSaved: () => void
}

function DeckModal({ deck, onClose, onSaved }: DeckModalProps) {
  const editing = Boolean(deck?.id)
  const [name, setName] = useState(deck?.name ?? '')
  const [archetype, setArchetype] = useState(deck?.archetype ?? '')
  const [notes, setNotes] = useState(deck?.notes ?? '')
  const [cards, setCards] = useState<DeckCardEntry[]>(deck?.cards ?? [])
  const [saving, setSaving] = useState(false)

  const totalCards = cards.reduce((s, c) => s + c.count, 0)

  const addCard = (card: PTCGCard) => {
    setCards(prev => {
      const existing = prev.find(c => c.id === card.id)
      if (existing) return prev.map(c => c.id === card.id ? { ...c, count: c.count + 1 } : c)
      return [...prev, { id: card.id, name: card.name, image: card.images?.small ?? '', count: 1 }]
    })
  }

  const adjustCount = (id: string, delta: number) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, count: Math.max(1, c.count + delta) } : c))
  }

  const removeCard = (id: string) => setCards(prev => prev.filter(c => c.id !== id))

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editing && deck) {
        await updatePTCGDeck(deck.id, { name, archetype, cards, notes })
      } else {
        await createPTCGDeck({ name, archetype, cards, notes })
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="font-headline-md text-on-surface">{editing ? 'Edit Deck' : 'New Deck'}</h2>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors">close</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Charizard ex"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-body-md text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">Archetype</label>
              <input
                value={archetype}
                onChange={e => setArchetype(e.target.value)}
                placeholder="e.g. Charizard / Pidgeot"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-body-md text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Strategy, matchup notes…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-body-md text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider">Cards ({totalCards}/60)</label>
              <span className={`font-label-sm font-mono ${totalCards === 60 ? 'text-primary' : totalCards > 60 ? 'text-error' : 'text-on-surface-variant'}`}>
                {totalCards === 60 ? '✓ Legal' : totalCards > 60 ? '✗ Over limit' : `${60 - totalCards} more`}
              </span>
            </div>
            <CardSearchInput onSelect={addCard} />
            {cards.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {cards.map(card => (
                  <div key={card.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
                    {card.image && <img src={card.image} alt={card.name} className="w-6 h-8 object-cover rounded shrink-0" />}
                    <span className="flex-1 font-body-md text-on-surface truncate">{card.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => adjustCount(card.id, -1)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-on-surface-variant font-mono text-xs transition-colors">−</button>
                      <span className="w-6 text-center font-mono text-primary text-sm">{card.count}</span>
                      <button onClick={() => adjustCount(card.id, 1)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-on-surface-variant font-mono text-xs transition-colors">+</button>
                      <button onClick={() => removeCard(card.id)} className="w-6 h-6 rounded-lg bg-error/10 hover:bg-error/20 text-error text-xs ml-1 transition-colors">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-white/5">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            className="flex-1 glass-card border border-white/10 rounded-xl py-2.5 font-label-sm text-on-surface-variant">
            Cancel
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 glass-panel border border-primary/40 rounded-xl py-2.5 font-label-sm text-primary disabled:opacity-40 moss-glow">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Deck'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PTCGDecks() {
  const [decks, setDecks] = useState<PTCGDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<PTCGDeck | null | 'new'>('new' as any)

  // Start with null (modal closed) once we've loaded
  const [modalOpen, setModalOpen] = useState(false)
  const [editDeck, setEditDeck] = useState<PTCGDeck | null>(null)

  const load = async () => {
    try {
      setDecks(await getPTCGDecks())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditDeck(null); setModalOpen(true) }
  const openEdit = (deck: PTCGDeck) => { setEditDeck(deck); setModalOpen(true) }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this deck?')) return
    await deletePTCGDeck(id)
    load()
  }

  const handlePlayed = async (id: number) => {
    await markPTCGDeckPlayed(id)
    load()
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar showNav />
      <Sidebar variant="below-topbar" />
      <main className="ml-0 md:ml-64 pt-16 min-h-screen" role="main">
        <PTCGNav />
        <div className="max-w-5xl mx-auto px-4 py-8">

          <AnimateIn>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">style</span>
                <h1 className="font-headline-lg text-on-surface">My Decks</h1>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                onClick={openNew}
                className="glass-panel border border-primary/30 text-primary font-label-sm px-4 py-2 rounded-xl flex items-center gap-2 moss-glow"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                New Deck
              </motion.button>
            </div>
          </AnimateIn>

          {loading && (
            <div className="flex justify-center py-24">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading && decks.length === 0 && (
            <AnimateIn>
              <div className="glass-panel text-center py-20 rounded-2xl">
                <span className="material-symbols-outlined text-5xl text-primary mb-4 block">style</span>
                <p className="font-body-lg text-on-surface-variant mb-6">No decks yet. Add your first deck!</p>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  onClick={openNew}
                  className="glass-panel border border-primary/40 text-primary font-label-sm px-6 py-2.5 rounded-xl moss-glow">
                  Create Deck
                </motion.button>
              </div>
            </AnimateIn>
          )}

          {!loading && decks.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck, i) => {
                const { label, color } = daysAgo(deck.last_played)
                const totalCards = deck.cards.reduce((s, c) => s + c.count, 0)
                return (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -5, scale: 1.015 }}
                    className="glass-card border border-white/8 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-body-lg text-on-surface truncate">{deck.name}</p>
                        {deck.archetype && (
                          <p className="font-label-sm text-on-surface-variant truncate">{deck.archetype}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(deck)}
                          className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors text-base p-1">
                          edit
                        </button>
                        <button onClick={() => handleDelete(deck.id)}
                          className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors text-base p-1">
                          delete
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-label-sm">
                      <span className="text-on-surface-variant">{deck.cards.length} types · {totalCards}/60</span>
                      <span className={color}>{label}</span>
                    </div>

                    {deck.notes && (
                      <p className="font-label-sm text-on-surface-variant bg-white/5 rounded-xl p-2.5 line-clamp-2">
                        {deck.notes}
                      </p>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handlePlayed(deck.id)}
                      className="mt-auto glass-surface border border-primary/20 text-primary font-label-sm py-2 rounded-xl flex items-center justify-center gap-2 hover:border-primary/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Mark as Played
                    </motion.button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {modalOpen && (
          <DeckModal
            deck={editDeck}
            onClose={() => setModalOpen(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      <MobileBottomNav />
    </div>
  )
}
