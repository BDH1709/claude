#!/usr/bin/env node
// Interactief script om de (enige) gebruiker aan te maken of het wachtwoord te wijzigen.
// Gebruik: npm run create-admin

const readline = require('node:readline');
const bcrypt = require('bcryptjs');
const db = require('../src/db');

// Eigen regel-buffer bovenop readline i.p.v. rl.question(): rl.question() verliest
// regels die aankomen vóórdat de volgende vraag geregistreerd is (bijv. bij
// input via een pipe/heredoc, waar alle regels in één keer binnenkomen).
function maakLezer() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const wachtendeRegels = [];
  const wachtendeResolvers = [];

  rl.on('line', (regel) => {
    if (wachtendeResolvers.length > 0) {
      wachtendeResolvers.shift()(regel);
    } else {
      wachtendeRegels.push(regel);
    }
  });

  function volgendeRegel() {
    if (wachtendeRegels.length > 0) {
      return Promise.resolve(wachtendeRegels.shift());
    }
    return new Promise((resolve) => wachtendeResolvers.push(resolve));
  }

  async function vraag(tekst) {
    process.stdout.write(tekst);
    return volgendeRegel();
  }

  return { vraag, sluit: () => rl.close() };
}

async function main() {
  const { vraag, sluit } = maakLezer();

  const bestaandeGebruiker = db.prepare('SELECT * FROM gebruiker WHERE id = 1').get();
  if (bestaandeGebruiker) {
    console.log(`Er bestaat al een account (${bestaandeGebruiker.gebruikersnaam}).`);
    const doorgaan = await vraag('Wachtwoord opnieuw instellen? (ja/nee): ');
    if (doorgaan.trim().toLowerCase() !== 'ja') {
      sluit();
      return;
    }
  }

  const gebruikersnaam = (await vraag('Gebruikersnaam: ')).trim();
  if (!gebruikersnaam) {
    console.error('Gebruikersnaam mag niet leeg zijn.');
    sluit();
    process.exitCode = 1;
    return;
  }

  const wachtwoord = await vraag('Wachtwoord (min. 12 tekens): ');
  if (!wachtwoord || wachtwoord.length < 12) {
    console.error('Wachtwoord moet minimaal 12 tekens lang zijn.');
    sluit();
    process.exitCode = 1;
    return;
  }
  const wachtwoordBevestiging = await vraag('Bevestig wachtwoord: ');
  if (wachtwoord !== wachtwoordBevestiging) {
    console.error('Wachtwoorden komen niet overeen.');
    sluit();
    process.exitCode = 1;
    return;
  }

  const hash = bcrypt.hashSync(wachtwoord, 12);

  db.prepare(
    `INSERT INTO gebruiker (id, gebruikersnaam, wachtwoord_hash) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET gebruikersnaam = excluded.gebruikersnaam, wachtwoord_hash = excluded.wachtwoord_hash`
  ).run(gebruikersnaam, hash);

  console.log('Account opgeslagen. Je kunt nu inloggen.');
  sluit();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
