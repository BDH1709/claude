const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'ptcg.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS my_decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    archetype TEXT,
    cards TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT '',
    last_played TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT,
    players INTEGER,
    format TEXT,
    country TEXT,
    top_decks TEXT DEFAULT '[]',
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meta_cache (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    archetypes TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meta_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL DEFAULT (datetime('now')),
    archetypes TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Ensure single meta_cache row exists
const existingCache = db.prepare('SELECT id FROM meta_cache WHERE id = 1').get();
if (!existingCache) {
  db.prepare("INSERT INTO meta_cache (id, archetypes) VALUES (1, '[]')").run();
}

module.exports = db;
