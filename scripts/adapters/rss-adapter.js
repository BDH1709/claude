/**
 * Adapter voor RSS/XML-vacaturefeeds. Haalt de feed op, parst <item>-blokken
 * met een lichte regex-parser (geen extra dependency nodig) en normaliseert
 * elk item naar het uniforme vacaturemodel.
 *
 * Verwacht generieke RSS-velden: <title>, <link>, <description>, <pubDate>.
 * Vacaturespecifieke velden (groep, fte, begeleiding, ...) staan meestal niet
 * in een standaard-RSS-feed; deze adapter vult ze met standaardwaarden die
 * later in de detailweergave handmatig aangevuld kunnen worden.
 */

const { maakUniformeVacature } = require("../normaliseer");

function haalTagOp(blok, tag) {
  const match = blok.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseItems(xml) {
  const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
  return items.map((blok) => ({
    functietitel: haalTagOp(blok, "title"),
    url: haalTagOp(blok, "link"),
    vacaturetekst: haalTagOp(blok, "description"),
    datum_gepubliceerd: normaliseerDatum(haalTagOp(blok, "pubDate")),
  }));
}

function normaliseerDatum(ruweDatum) {
  if (!ruweDatum) return undefined;
  const datum = new Date(ruweDatum);
  return Number.isNaN(datum.getTime()) ? undefined : datum.toISOString().slice(0, 10);
}

async function haalOp(bronConfig) {
  const respons = await fetch(bronConfig.url, { signal: AbortSignal.timeout(15000) });
  if (!respons.ok) {
    throw new Error(`RSS-bron ${bronConfig.id} gaf status ${respons.status}`);
  }
  const xml = await respons.text();
  const ruweItems = parseItems(xml);
  return ruweItems.map((ruw) => maakUniformeVacature(ruw, bronConfig.id));
}

module.exports = { haalOp };
