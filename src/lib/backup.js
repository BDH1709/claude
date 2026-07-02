const path = require('node:path');
const fs = require('node:fs');
const db = require('../db');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups');
const BEWAAR_AANTAL_DAGEN = parseInt(process.env.BACKUP_BEWAARDAGEN || '14', 10);

fs.mkdirSync(BACKUP_DIR, { recursive: true });

function tijdstempel() {
  const nu = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${pad(nu.getMonth() + 1)}-${pad(nu.getDate())}_${pad(nu.getHours())}${pad(nu.getMinutes())}`;
}

// Maakt een consistente hot-backup van de SQLite-database via de ingebouwde
// backup-API van better-sqlite3 (veilig te gebruiken terwijl de app draait).
async function maakBackup() {
  const bestandsnaam = `onderwijshub_${tijdstempel()}.db`;
  const doel = path.join(BACKUP_DIR, bestandsnaam);
  await db.backup(doel);
  ruimOudeBackupsOp();
  return doel;
}

function ruimOudeBackupsOp() {
  const grens = Date.now() - BEWAAR_AANTAL_DAGEN * 24 * 60 * 60 * 1000;
  for (const bestand of fs.readdirSync(BACKUP_DIR)) {
    if (!bestand.startsWith('onderwijshub_') || !bestand.endsWith('.db')) continue;
    const volledigPad = path.join(BACKUP_DIR, bestand);
    const stat = fs.statSync(volledigPad);
    if (stat.mtimeMs < grens) fs.unlinkSync(volledigPad);
  }
}

function msTotVolgende(uur) {
  const nu = new Date();
  const volgende = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate(), uur, 0, 0, 0);
  if (volgende <= nu) volgende.setDate(volgende.getDate() + 1);
  return volgende - nu;
}

// Plant een dagelijkse backup op een vast uur (standaard 03:00 's nachts).
function planDagelijkseBackup(uur = 3) {
  const start = () => {
    maakBackup()
      .then((pad) => console.log(`Automatische backup gemaakt: ${pad}`))
      .catch((err) => console.error('Automatische backup mislukt:', err));
    setInterval(() => {
      maakBackup()
        .then((pad) => console.log(`Automatische backup gemaakt: ${pad}`))
        .catch((err) => console.error('Automatische backup mislukt:', err));
    }, 24 * 60 * 60 * 1000).unref();
  };
  setTimeout(start, msTotVolgende(uur)).unref();
}

module.exports = { maakBackup, planDagelijkseBackup, BACKUP_DIR };
