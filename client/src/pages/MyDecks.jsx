import { useState } from 'react';
import axios from 'axios';
import { useApi } from '../hooks/useApi';
import Spinner from '../components/Spinner';
import CardSearch from '../components/CardSearch';

function DaysAgo({ date }) {
  if (!date) return <span className="text-gray-500">Never played</span>;
  const diff = Math.floor((Date.now() - new Date(date)) / 86400000);
  if (diff === 0) return <span className="text-green-400">Played today</span>;
  if (diff === 1) return <span className="text-green-400">Yesterday</span>;
  if (diff <= 7) return <span className="text-yellow-400">{diff} days ago</span>;
  if (diff <= 14) return <span className="text-orange-400">{diff} days ago</span>;
  return <span className="text-red-400">{diff} days ago</span>;
}

function DeckModal({ deck, onClose, onSave }) {
  const editing = Boolean(deck?.id);
  const [name, setName] = useState(deck?.name || '');
  const [archetype, setArchetype] = useState(deck?.archetype || '');
  const [notes, setNotes] = useState(deck?.notes || '');
  const [cards, setCards] = useState(deck?.cards || []);
  const [saving, setSaving] = useState(false);

  const addCard = (card) => {
    setCards(prev => {
      const existing = prev.find(c => c.id === card.id);
      if (existing) {
        return prev.map(c => c.id === card.id ? { ...c, count: (c.count || 1) + 1 } : c);
      }
      return [...prev, { id: card.id, name: card.name, image: card.images?.small, count: 1 }];
    });
  };

  const removeCard = (id) => setCards(prev => prev.filter(c => c.id !== id));

  const updateCount = (id, delta) => {
    setCards(prev => prev
      .map(c => c.id === id ? { ...c, count: Math.max(1, (c.count || 1) + delta) } : c)
    );
  };

  const totalCards = cards.reduce((s, c) => s + (c.count || 1), 0);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name, archetype, notes, cards });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-pokemon-card border border-pokemon-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-pokemon-border">
          <h2 className="text-lg font-bold">{editing ? 'Edit Deck' : 'New Deck'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase font-semibold mb-1 block">Deck Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Charizard ex"
                className="w-full bg-pokemon-dark border border-pokemon-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pokemon-yellow"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase font-semibold mb-1 block">Archetype</label>
              <input
                value={archetype}
                onChange={e => setArchetype(e.target.value)}
                placeholder="e.g. Charizard ex / Pidgeot"
                className="w-full bg-pokemon-dark border border-pokemon-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pokemon-yellow"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-semibold mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Strategy notes, matchup tips..."
              className="w-full bg-pokemon-dark border border-pokemon-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pokemon-yellow resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 uppercase font-semibold">Cards ({totalCards}/60)</label>
              <span className={`text-xs font-mono ${totalCards === 60 ? 'text-green-400' : totalCards > 60 ? 'text-red-400' : 'text-gray-500'}`}>
                {totalCards === 60 ? '✓ Legal' : totalCards > 60 ? '✗ Over limit' : `${60 - totalCards} more needed`}
              </span>
            </div>
            <CardSearch onSelect={addCard} placeholder="Search and add cards..." />

            {cards.length > 0 && (
              <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                {cards.map(card => (
                  <div key={card.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                    {card.image && <img src={card.image} alt={card.name} className="w-6 h-8 object-cover rounded" />}
                    <span className="flex-1 text-sm text-white truncate">{card.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateCount(card.id, -1)} className="w-6 h-6 rounded bg-pokemon-border hover:bg-pokemon-blue text-white text-xs">−</button>
                      <span className="w-6 text-center text-sm font-mono text-pokemon-yellow">{card.count || 1}</span>
                      <button onClick={() => updateCount(card.id, 1)} className="w-6 h-6 rounded bg-pokemon-border hover:bg-pokemon-blue text-white text-xs">+</button>
                      <button onClick={() => removeCard(card.id)} className="w-6 h-6 rounded bg-red-900/50 hover:bg-red-700 text-red-400 hover:text-white text-xs ml-1">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-pokemon-border">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Deck'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyDecks() {
  const { data: decks, loading, refetch } = useApi('/api/decks');
  const [modal, setModal] = useState(null); // null | 'new' | deck object

  const handleCreate = async (payload) => {
    await axios.post('/api/decks', payload);
    await refetch();
  };

  const handleUpdate = async (id, payload) => {
    await axios.put(`/api/decks/${id}`, payload);
    await refetch();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this deck?')) return;
    await axios.delete(`/api/decks/${id}`);
    await refetch();
  };

  const handlePlayed = async (id) => {
    await axios.patch(`/api/decks/${id}/played`);
    await refetch();
  };

  if (loading) return <Spinner text="Loading decks..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">My Decks</h1>
        <button className="btn-primary" onClick={() => setModal('new')}>+ New Deck</button>
      </div>

      {(!decks || decks.length === 0) ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🃏</p>
          <p className="mb-4">No decks saved yet. Add your first deck!</p>
          <button className="btn-primary" onClick={() => setModal('new')}>Create Deck</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map(deck => (
            <div key={deck.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-white truncate">{deck.name}</h3>
                  {deck.archetype && (
                    <p className="text-xs text-gray-400 truncate">{deck.archetype}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setModal(deck)}
                    title="Edit deck"
                    className="w-7 h-7 rounded bg-pokemon-border hover:bg-pokemon-blue text-gray-300 hover:text-white text-xs"
                  >✎</button>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    title="Delete deck"
                    className="w-7 h-7 rounded bg-red-900/50 hover:bg-red-700 text-red-400 hover:text-white text-xs"
                  >✕</button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {deck.cards?.length || 0} card type{deck.cards?.length !== 1 ? 's' : ''} ·{' '}
                  {deck.cards?.reduce((s, c) => s + (c.count || 1), 0) || 0}/60
                </span>
                <DaysAgo date={deck.last_played} />
              </div>

              {deck.notes && (
                <p className="text-xs text-gray-400 bg-white/5 rounded-lg p-2 line-clamp-2">{deck.notes}</p>
              )}

              <button
                onClick={() => handlePlayed(deck.id)}
                className="mt-auto btn-secondary text-sm py-1.5 w-full"
              >
                ✓ Mark as Played
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <DeckModal
          deck={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={modal === 'new'
            ? handleCreate
            : (payload) => handleUpdate(modal.id, payload)
          }
        />
      )}
    </div>
  );
}
