const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./src/db/database');
const { fetchTournaments, buildMetaSnapshot } = require('./src/scrapers/limitless');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/meta', require('./src/routes/meta'));
app.use('/api/tournaments', require('./src/routes/tournaments'));
app.use('/api/decks', require('./src/routes/decks'));
app.use('/api/cards', require('./src/routes/cards'));

// Serve built React app in production
const clientDist = path.join(__dirname, 'client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Background: refresh meta data every 6 hours
async function refreshMeta() {
  try {
    console.log('[cron] Refreshing meta data...');
    const tournaments = await fetchTournaments(30);
    const archetypes = await buildMetaSnapshot(tournaments.slice(0, 15));
    const now = new Date().toISOString();
    db.prepare('UPDATE meta_cache SET archetypes = ?, updated_at = ? WHERE id = 1')
      .run(JSON.stringify(archetypes), now);
    db.prepare('INSERT INTO meta_snapshots (snapshot_date, archetypes) VALUES (?, ?)')
      .run(now, JSON.stringify(archetypes));
    console.log(`[cron] Meta updated: ${archetypes.length} archetypes`);
  } catch (err) {
    console.error('[cron] Meta refresh failed:', err.message);
  }
}

// Refresh tournaments every 3 hours
async function refreshTournaments() {
  try {
    const { fetchTournaments: ft } = require('./src/scrapers/limitless');
    const tournaments = await ft(20);
    const insert = db.prepare(`
      INSERT OR REPLACE INTO tournaments (id, name, date, players, format, country, top_decks, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const insertMany = db.transaction(ts => {
      for (const t of ts) {
        insert.run(
          t.id, t.name || '', t.date || '', t.players || 0,
          t.format || 'standard', t.country || '',
          JSON.stringify(t.top_decks || t.top_cut || [])
        );
      }
    });
    insertMany(tournaments);
    console.log(`[cron] Tournaments updated: ${tournaments.length}`);
  } catch (err) {
    console.error('[cron] Tournament refresh failed:', err.message);
  }
}

cron.schedule('0 */6 * * *', refreshMeta);
cron.schedule('0 */3 * * *', refreshTournaments);

app.listen(PORT, () => {
  console.log(`PTCG Meta Tracker running on http://localhost:${PORT}`);
  // Seed data on first run if cache is empty
  const cache = db.prepare('SELECT archetypes FROM meta_cache WHERE id = 1').get();
  if (JSON.parse(cache.archetypes).length === 0) {
    console.log('[startup] No meta cache found, fetching initial data...');
    refreshMeta();
    refreshTournaments();
  }
});
