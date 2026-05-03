const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/decks
router.get('/', (req, res) => {
  const decks = db.prepare('SELECT * FROM my_decks ORDER BY created_at DESC').all();
  res.json(decks.map(d => ({ ...d, cards: JSON.parse(d.cards) })));
});

// GET /api/decks/:id
router.get('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM my_decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  res.json({ ...deck, cards: JSON.parse(deck.cards) });
});

// POST /api/decks
router.post('/', (req, res) => {
  const { name, archetype, cards = [], notes = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(
    'INSERT INTO my_decks (name, archetype, cards, notes) VALUES (?, ?, ?, ?)'
  ).run(name, archetype || '', JSON.stringify(cards), notes);

  const deck = db.prepare('SELECT * FROM my_decks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...deck, cards: JSON.parse(deck.cards) });
});

// PUT /api/decks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM my_decks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Deck not found' });

  const { name, archetype, cards, notes } = req.body;

  db.prepare(`
    UPDATE my_decks SET
      name = COALESCE(?, name),
      archetype = COALESCE(?, archetype),
      cards = COALESCE(?, cards),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(
    name ?? null,
    archetype ?? null,
    cards ? JSON.stringify(cards) : null,
    notes ?? null,
    req.params.id
  );

  const deck = db.prepare('SELECT * FROM my_decks WHERE id = ?').get(req.params.id);
  res.json({ ...deck, cards: JSON.parse(deck.cards) });
});

// PATCH /api/decks/:id/played — mark as played today
router.patch('/:id/played', (req, res) => {
  const result = db.prepare(
    "UPDATE my_decks SET last_played = datetime('now') WHERE id = ?"
  ).run(req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Deck not found' });

  const deck = db.prepare('SELECT * FROM my_decks WHERE id = ?').get(req.params.id);
  res.json({ ...deck, cards: JSON.parse(deck.cards) });
});

// DELETE /api/decks/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM my_decks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Deck not found' });
  res.json({ success: true });
});

module.exports = router;
