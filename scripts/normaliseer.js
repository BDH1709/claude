/**
 * Normalisatielaag: zet ruwe data van een willekeurige bron om naar het
 * uniforme interne vacaturemodel dat de frontend gebruikt (data/vacatures.json).
 * Adapters geven ruwe, deels onvolledige velden door; deze functie vult
 * ontbrekende velden met veilige standaardwaarden.
 */

function pad(object, padString) {
  return padString.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), object);
}

let teller = 0;

function maakUniformeVacature(ruw, bronId) {
  teller += 1;
  return {
    id: ruw.id || `${bronId}-${Date.now()}-${teller}`,
    bron: bronId,
    url: ruw.url || "",
    schoolnaam: ruw.schoolnaam || "Onbekende school",
    plaats: ruw.plaats || "Onbekend",
    regio: ruw.regio || "Zuid-Holland",
    functietitel: ruw.functietitel || "Leerkracht",
    groepen: Array.isArray(ruw.groepen) ? ruw.groepen : (ruw.groepen ? [Number(ruw.groepen)] : []),
    fte: ruw.fte !== undefined ? Number(ruw.fte) : 1.0,
    contracttype: ruw.contracttype || `WTF ${ruw.fte ?? 1.0}`,
    vast_of_tijdelijk: ruw.vast_of_tijdelijk || "onbekend",
    schoolgrootte: ruw.schoolgrootte || "onbekend",
    aantal_leerlingen: ruw.aantal_leerlingen ?? null,
    parallelgroepen: Boolean(ruw.parallelgroepen),
    onderwijsvisie: ruw.onderwijsvisie || "",
    begeleiding: ruw.begeleiding || "",
    ov_bereikbaarheid: {
      score: ruw.ov_bereikbaarheid?.score ?? 3,
      toelichting: ruw.ov_bereikbaarheid?.toelichting || "",
    },
    reistijd_minuten: ruw.reistijd_minuten ?? 30,
    innovatie_score: ruw.innovatie_score ?? 3,
    steam_score: ruw.steam_score ?? 3,
    vacaturetekst: ruw.vacaturetekst || ruw.beschrijving || "",
    datum_gepubliceerd: ruw.datum_gepubliceerd || new Date().toISOString().slice(0, 10),
    notities: [],
    reflectie: null,
  };
}

function mapMetVeldmapping(ruwObject, veldmapping) {
  const resultaat = {};
  Object.entries(veldmapping || {}).forEach(([doelVeld, bronPad]) => {
    resultaat[doelVeld] = pad(ruwObject, bronPad);
  });
  return resultaat;
}

module.exports = { maakUniformeVacature, mapMetVeldmapping, pad };
