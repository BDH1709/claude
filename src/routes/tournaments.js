const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { fetchTournaments, fetchTournamentDetails } = require('../scrapers/limitless');

// GET /api/tournaments
router.get('/', async (req, res) => {
  const cached = db.prepare(
    'SELECT * FROM tournaments ORDER BY date DESC LIMIT 20'
  ).all();

  if (cached.length > 0) {
    return res.json(cached.map(t => ({ ...t, top_decks: JSON.parse(t.top_decks) })));
  }

  // If no cache, fetch live
  try {
    const tournaments = await fetchTournaments(20);
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tournaments/:id
router.get('/:id', async (req, res) => {
  const cached = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (cached) {
    return res.json({ ...cached, top_decks: JSON.parse(cached.top_decks) });
  }

  try {
    const { standings, decks } = await fetchTournamentDetails(req.params.id);
    res.json({ standings, decks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tournaments/refresh
router.post('/refresh', async (req, res) => {
  try {
    const tournaments = await fetchTournaments(20);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO tournaments (id, name, date, players, format, country, top_decks, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertMany = db.transaction(ts => {
      for (const t of ts) {
        insert.run(
          t.id,
          t.name || t.tournament_name || '',
          t.date || t.tournament_date || '',
          t.players || 0,
          t.format || 'standard',
          t.country || t.region || '',
          JSON.stringify(t.top_decks || t.top_cut || [])
        );
      }
    });

    insertMany(tournaments);
    res.json({ success: true, count: tournaments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
