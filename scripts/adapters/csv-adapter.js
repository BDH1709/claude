/**
 * Adapter voor CSV-import: een eenvoudige fallback voor handmatig aangeleverde
 * vacatures (bv. een Excel-export). Verwacht een kopregel met kolomnamen die
 * overeenkomen met (een deel van) het uniforme vacaturemodel.
 */

const fs = require("fs");
const { maakUniformeVacature } = require("../normaliseer");

function parseCsvRegel(regel) {
  return regel.split(",").map((veld) => veld.trim().replace(/^"|"$/g, ""));
}

function parseCsv(tekst) {
  const regels = tekst.split(/\r?\n/).filter((r) => r.trim().length > 0);
  if (regels.length === 0) return [];
  const kolommen = parseCsvRegel(regels[0]);
  return regels.slice(1).map((regel) => {
    const waarden = parseCsvRegel(regel);
    const object = {};
    kolommen.forEach((kolom, i) => { object[kolom] = waarden[i]; });
    if (object.groepen) object.groepen = object.groepen.split("/").map(Number);
    if (object.parallelgroepen) object.parallelgroepen = object.parallelgroepen.toLowerCase() === "true" || object.parallelgroepen === "ja";
    return object;
  });
}

async function haalOp(bronConfig) {
  if (!fs.existsSync(bronConfig.pad)) {
    throw new Error(`CSV-bestand niet gevonden: ${bronConfig.pad}`);
  }
  const tekst = fs.readFileSync(bronConfig.pad, "utf-8");
  const ruweRijen = parseCsv(tekst);
  return ruweRijen.map((ruw) => maakUniformeVacature(ruw, bronConfig.id));
}

module.exports = { haalOp };
