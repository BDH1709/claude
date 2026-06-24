#!/usr/bin/env node
/**
 * Orchestreert het ophalen van vacatures uit alle ingeschakelde bronnen in
 * scripts/feeds.config.json, normaliseert ze naar het uniforme model en
 * schrijft het resultaat naar data/vacatures.json.
 *
 * Architectuur (zie ook plan/README):
 *   bronlaag (adapters/*) -> normalisatielaag (normaliseer.js)
 *   -> opslaglaag (dit script, atomic write + backup)
 *   -> presentatielaag (frontend leest alleen data/vacatures.json)
 *
 * Belangrijk: als een bron niet bereikbaar is of geen enkele bron is
 * ingeschakeld, blijft het bestaande data/vacatures.json onveranderd staan
 * (fallback). Bestaande notities en reflecties van Bas blijven behouden voor
 * vacatures die (op url) ook in de nieuwe import voorkomen.
 *
 * Gebruik:
 *   node scripts/import-feeds.js            # echte run, schrijft bestand
 *   node scripts/import-feeds.js --dry-run  # alleen ophalen/normaliseren tonen
 */

const fs = require("fs");
const path = require("path");

const rssAdapter = require("./adapters/rss-adapter");
const jsonAdapter = require("./adapters/json-adapter");
const csvAdapter = require("./adapters/csv-adapter");

const ADAPTERS = { rss: rssAdapter, json: jsonAdapter, csv: csvAdapter };

const CONFIG_PAD = path.join(__dirname, "feeds.config.json");
const DATA_PAD = path.join(__dirname, "..", "data", "vacatures.json");
const BACKUP_PAD = path.join(__dirname, "..", "data", "vacatures.backup.json");

function log(...args) {
  console.log(`[import-feeds ${new Date().toISOString()}]`, ...args);
}

function leesBestaandeVacatures() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PAD, "utf-8"));
  } catch (e) {
    log("Kon bestaand data/vacatures.json niet lezen, start met leeg bestand.", e.message);
    return [];
  }
}

function behoudPersoonlijkeData(nieuweVacatures, bestaandeVacatures) {
  const bestaandPerUrl = new Map(bestaandeVacatures.map((v) => [v.url, v]));
  return nieuweVacatures.map((nieuw) => {
    const bestaand = bestaandPerUrl.get(nieuw.url);
    if (!bestaand) return nieuw;
    return { ...nieuw, id: bestaand.id, notities: bestaand.notities || [], reflectie: bestaand.reflectie || null };
  });
}

function deduplicerenOpUrl(vacatures) {
  const gezien = new Set();
  return vacatures.filter((v) => {
    if (!v.url || gezien.has(v.url)) return false;
    gezien.add(v.url);
    return true;
  });
}

function schrijfAtomic(pad, data) {
  const tijdelijkPad = `${pad}.tmp`;
  fs.writeFileSync(tijdelijkPad, JSON.stringify(data, null, 2));
  fs.renameSync(tijdelijkPad, pad);
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const config = JSON.parse(fs.readFileSync(CONFIG_PAD, "utf-8"));
  const ingeschakeldeBronnen = config.bronnen.filter((b) => b.ingeschakeld);

  if (ingeschakeldeBronnen.length === 0) {
    log("Geen bronnen ingeschakeld in feeds.config.json — data/vacatures.json blijft ongewijzigd.");
    log("Zet 'ingeschakeld': true bij een bron in scripts/feeds.config.json om import te activeren.");
    return;
  }

  const resultaten = [];
  for (const bron of ingeschakeldeBronnen) {
    const adapter = ADAPTERS[bron.type];
    if (!adapter) {
      log(`Onbekend brontype '${bron.type}' voor bron '${bron.id}', wordt overgeslagen.`);
      continue;
    }
    try {
      const vacatures = await adapter.haalOp(bron);
      log(`Bron '${bron.id}' (${bron.type}) leverde ${vacatures.length} vacature(s) op.`);
      resultaten.push(...vacatures);
    } catch (fout) {
      log(`Fout bij ophalen van bron '${bron.id}': ${fout.message}. Deze bron wordt overgeslagen, andere bronnen gaan door.`);
    }
  }

  if (resultaten.length === 0) {
    log("Geen enkele bron leverde data op — data/vacatures.json blijft ongewijzigd als fallback.");
    return;
  }

  const bestaande = leesBestaandeVacatures();
  const gededupliceerd = deduplicerenOpUrl(resultaten);
  const metBehoudVanNotities = behoudPersoonlijkeData(gededupliceerd, bestaande);

  if (dryRun) {
    log("Dry-run: onderstaande data zou geschreven worden (niet opgeslagen).");
    console.log(JSON.stringify(metBehoudVanNotities, null, 2));
    return;
  }

  if (fs.existsSync(DATA_PAD)) {
    fs.copyFileSync(DATA_PAD, BACKUP_PAD);
  }
  schrijfAtomic(DATA_PAD, metBehoudVanNotities);
  log(`data/vacatures.json bijgewerkt met ${metBehoudVanNotities.length} vacature(s). Vorige versie staat in data/vacatures.backup.json.`);
}

run().catch((fout) => {
  console.error("Onverwachte fout in import-feeds.js:", fout);
  process.exitCode = 1;
});
