const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Zet elke testrun op een eigen, tijdelijke database en session-secret,
// zodat tests geen data delen en niet de echte data/-map raken.
function initTestOmgeving() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onderwijshub-test-'));
  process.env.DATA_DIR = tmpDir;
  process.env.DB_PATH = path.join(tmpDir, 'test.db');
  process.env.BACKUP_DIR = path.join(tmpDir, 'backups');
  process.env.SESSION_SECRET = 'test-secret-die-lang-genoeg-is-1234567890';
  process.env.NODE_ENV = 'test';

  // Modulecache leegmaken zodat db/server met de nieuwe env-variabelen opnieuw laden.
  Object.keys(require.cache).forEach((key) => {
    if (key.includes(`${path.sep}src${path.sep}`)) delete require.cache[key];
  });

  return tmpDir;
}

function maakTestgebruiker(db, { gebruikersnaam = 'meester', wachtwoord = 'testwachtwoord123' } = {}) {
  const bcrypt = require('bcryptjs');
  db.prepare(
    `INSERT INTO gebruiker (id, gebruikersnaam, wachtwoord_hash) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET gebruikersnaam = excluded.gebruikersnaam, wachtwoord_hash = excluded.wachtwoord_hash`
  ).run(gebruikersnaam, bcrypt.hashSync(wachtwoord, 4));
  return { gebruikersnaam, wachtwoord };
}

module.exports = { initTestOmgeving, maakTestgebruiker };
