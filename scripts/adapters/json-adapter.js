/**
 * Adapter voor JSON-API-vacaturebronnen. Haalt JSON op en normaliseert elk
 * item naar het uniforme vacaturemodel, met optionele 'veldmapping' in
 * feeds.config.json (bv. { "schoolnaam": "school.naam" }) zodat verschillende
 * API-structuren zonder codewijziging gekoppeld kunnen worden.
 */

const { maakUniformeVacature, mapMetVeldmapping } = require("../normaliseer");

async function haalOp(bronConfig) {
  const respons = await fetch(bronConfig.url, { signal: AbortSignal.timeout(15000) });
  if (!respons.ok) {
    throw new Error(`JSON-bron ${bronConfig.id} gaf status ${respons.status}`);
  }
  const data = await respons.json();
  const items = Array.isArray(data) ? data : (data.items || data.vacatures || data.results || []);

  return items.map((ruwItem) => {
    const gemapt = bronConfig.veldmapping ? mapMetVeldmapping(ruwItem, bronConfig.veldmapping) : ruwItem;
    return maakUniformeVacature(gemapt, bronConfig.id);
  });
}

module.exports = { haalOp };
