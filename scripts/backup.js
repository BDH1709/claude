#!/usr/bin/env node
// Handmatig een backup maken, bijvoorbeeld vanaf host-cron via:
//   docker compose exec onderwijshub node scripts/backup.js
const { maakBackup } = require('../src/lib/backup');

maakBackup()
  .then((pad) => {
    console.log(`Backup gemaakt: ${pad}`);
  })
  .catch((err) => {
    console.error('Backup mislukt:', err);
    process.exitCode = 1;
  });
