const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { fetchTournaments, buildMetaSnapshot } = require('../scrapers/limitless');

// GET /api/meta — current meta tier list
router.get('/', (req, res) => {
  const cache = db.prepare('SELECT archetypes, updated_at FROM meta_cache WHERE id = 1').get();
  res.json({
    archetypes: JSON.parse(cache.archetypes),
    updated_at: cache.updated_at,
  });
});

// POST /api/meta/refresh — manually trigger a meta refresh
router.post('/refresh', async (req, res) => {
  try {
    const tournaments = await fetchTournaments(30);
    const recent = tournaments.slice(0, 15);
    const archetypes = await buildMetaSnapshot(recent);

    const now = new Date().toISOString();

    db.prepare('UPDATE meta_cache SET archetypes = ?, updated_at = ? WHERE id = 1')
      .run(JSON.stringify(archetypes), now);

    // Save snapshot for catch-up diff
    db.prepare('INSERT INTO meta_snapshots (snapshot_date, archetypes) VALUES (?, ?)')
      .run(now, JSON.stringify(archetypes));

    res.json({ success: true, archetypes, updated_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meta/catchup — diff between now and ~2 weeks ago
router.get('/catchup', (req, res) => {
  const current = db.prepare('SELECT archetypes, updated_at FROM meta_cache WHERE id = 1').get();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const old = db.prepare(
    'SELECT archetypes, snapshot_date FROM meta_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1'
  ).get(twoWeeksAgo);

  const currentArchetypes = JSON.parse(current.archetypes);

  if (!old) {
    return res.json({
      current: currentArchetypes,
      previous: null,
      changes: [],
      snapshot_date: null,
      updated_at: current.updated_at,
    });
  }

  const prevArchetypes = JSON.parse(old.archetypes);
  const prevMap = Object.fromEntries(prevArchetypes.map(a => [a.name, a]));
  const currMap = Object.fromEntries(currentArchetypes.map(a => [a.name, a]));

  const changes = [];

  currentArchetypes.forEach(curr => {
    const prev = prevMap[curr.name];
    if (!prev) {
      changes.push({ type: 'new', archetype: curr.name, tier: curr.tier });
    } else if (prev.tier !== curr.tier) {
      changes.push({
        type: 'tier_change',
        archetype: curr.name,
        from: prev.tier,
        to: curr.tier,
      });
    }
  });

  prevArchetypes.forEach(prev => {
    if (!currMap[prev.name]) {
      changes.push({ type: 'dropped', archetype: prev.name, tier: prev.tier });
    }
  });

  res.json({
    current: currentArchetypes,
    previous: prevArchetypes,
    changes,
    snapshot_date: old.snapshot_date,
    updated_at: current.updated_at,
  });
});

module.exports = router;
