/**
 * Matchscore-engine: berekent een persoonlijke, uitlegbare score (0-100) voor
 * een vacature op basis van het profiel in data/profiel.json.
 *
 * Belangrijk: de score is nooit een kaal getal. berekenMatchscore() geeft
 * altijd ook de deelscores, pluspunten, aandachtspunten, risico's en
 * gespreksvragen terug zodat in de UI uitgelegd kan worden waarom een
 * vacature wel of niet goed scoort.
 */

const POSITIEVE_TEKSTSIGNALEN = [
  "onderzoek", "eigenaarschap", "autonomie", "coaching", "maatwerk",
  "innovatie", "samenwerking", "ontwikkeling", "ruimte voor", "ontdek",
];

const NEGATIEVE_TEKSTSIGNALEN = [
  "moet kunnen werken onder druk", "hoge werkdruk", "veel uitval",
  "tijdelijk vanwege reorganisatie", "improviseren", "zelfstandig oplossen",
];

function scoreGroepMatch(vacature, profiel) {
  const voorkeur = profiel.voorkeursgroepen;
  const groepen = vacature.groepen || [];
  const overlap = groepen.filter((g) => voorkeur.includes(g));
  if (overlap.length === groepen.length && overlap.length > 0) {
    return { punten: profiel.gewichten.groep_match, max: profiel.gewichten.groep_match,
      label: `Groep(en) ${groepen.join("/")} sluiten volledig aan bij je voorkeur (5/6/7).` };
  }
  if (overlap.length > 0) {
    return { punten: profiel.gewichten.groep_match * 0.6, max: profiel.gewichten.groep_match,
      label: `Combinatiegroep ${groepen.join("/")} sluit deels aan bij je voorkeur.` };
  }
  return { punten: 0, max: profiel.gewichten.groep_match,
    label: `Groep(en) ${groepen.join("/")} sluiten niet aan bij je voorkeursgroepen 5/6/7.` };
}

function scoreRegioReistijd(vacature, profiel) {
  const max = profiel.gewichten.regio_reistijd;
  const reistijd = vacature.reistijd_minuten;
  const drempel = profiel.max_reistijd_minuten;
  if (reistijd <= drempel) {
    return { punten: max, max, label: `Reistijd van ${reistijd} minuten valt binnen je gewenste straal van ${drempel} minuten rond Zoetermeer.` };
  }
  if (reistijd <= drempel + 10) {
    const factor = 1 - (reistijd - drempel) / 10 * 0.6;
    return { punten: max * Math.max(factor, 0.2), max,
      label: `Reistijd van ${reistijd} minuten ligt net buiten je gewenste straal van ${drempel} minuten.` };
  }
  return { punten: max * 0.1, max, label: `Reistijd van ${reistijd} minuten ligt ver buiten je gewenste straal rond Zoetermeer.` };
}

function scoreOv(vacature, profiel) {
  const max = profiel.gewichten.ov_bereikbaarheid;
  const ovScore = vacature.ov_bereikbaarheid?.score ?? 3;
  const punten = (ovScore / 5) * max;
  return { punten, max, label: `OV-bereikbaarheid beoordeeld als ${ovScore}/5: ${vacature.ov_bereikbaarheid?.toelichting ?? ""}` };
}

function scoreContract(vacature, profiel) {
  const max = profiel.gewichten.contract_vast;
  const tekst = (vacature.vast_of_tijdelijk || "").toLowerCase();
  if (tekst.includes("vast") && !tekst.includes("tijdelijk")) {
    return { punten: max, max, label: "Vaste aanstelling, zoals je wenst." };
  }
  if (tekst.includes("uitzicht op vast") || tekst.includes("na proefjaar")) {
    return { punten: max * 0.65, max, label: "Tijdelijk contract, maar met reëel uitzicht op een vaste aanstelling." };
  }
  return { punten: max * 0.15, max, label: "Tijdelijke aanstelling zonder duidelijk perspectief op een vast contract." };
}

function scoreFulltime(vacature, profiel) {
  const max = profiel.gewichten.dienstverband_fulltime;
  const fte = vacature.fte || 0;
  if (fte >= 1.0) return { punten: max, max, label: "Fulltime (1,0 fte) beschikbaar." };
  if (fte >= 0.8) return { punten: max * 0.7, max, label: `Bijna fulltime (${fte} fte), kleine aanvulling elders nodig.` };
  return { punten: max * 0.3, max, label: `Deeltijdfunctie (${fte} fte), past minder bij je fulltime-wens.` };
}

function scoreBegeleiding(vacature, profiel) {
  const max = profiel.gewichten.begeleiding;
  const tekst = (vacature.begeleiding || "").toLowerCase();
  const sterk = ["mentor", "coach", "intervisie", "wekelijks", "opleidingsschool", "ontwikkelplan"];
  const treffers = sterk.filter((w) => tekst.includes(w)).length;
  const zwak = tekst.includes("geen vaste mentor") || tekst.includes("zelfstandig") || tekst.includes("korte introductie");
  if (zwak && treffers === 0) {
    return { punten: max * 0.15, max, label: "Begeleiding lijkt beperkt: " + vacature.begeleiding };
  }
  const factor = Math.min(1, 0.4 + treffers * 0.2);
  return { punten: max * factor, max, label: "Begeleiding: " + vacature.begeleiding };
}

function scoreSchoolgrootte(vacature, profiel) {
  const max = profiel.gewichten.schoolgrootte;
  const voorkeur = profiel.schoolgrootte_voorkeur;
  if (voorkeur.includes(vacature.schoolgrootte)) {
    return { punten: max, max, label: `Schoolgrootte '${vacature.schoolgrootte}' (${vacature.aantal_leerlingen} leerlingen) sluit aan bij je voorkeur.` };
  }
  return { punten: max * 0.25, max, label: `Schoolgrootte '${vacature.schoolgrootte}' (${vacature.aantal_leerlingen} leerlingen) is kleiner dan je voorkeur.` };
}

function scoreParallel(vacature, profiel) {
  const max = profiel.gewichten.parallelgroepen;
  if (vacature.parallelgroepen) {
    return { punten: max, max, label: "Er zijn parallelgroepen / dubbele klassen om mee samen te werken." };
  }
  return { punten: max * 0.1, max, label: "Geen parallelgroepen aanwezig op deze school." };
}

function scoreOnderzoekend(vacature, profiel) {
  const max = profiel.gewichten.onderzoekend_leren;
  const visie = (vacature.onderwijsvisie || "").toLowerCase();
  if (visie.includes("onderzoekend") || visie.includes("onderzoek")) {
    const sterk = visie.includes("centraal") || visie.includes("kern");
    return { punten: max * (sterk ? 1 : 0.7), max, label: "Onderwijsvisie: " + vacature.onderwijsvisie };
  }
  return { punten: max * 0.2, max, label: "Onderzoekend leren is geen duidelijk onderdeel van de onderwijsvisie." };
}

function scoreSteam(vacature, profiel) {
  const max = profiel.gewichten.steam_innovatie;
  const steam = vacature.steam_score ?? 1;
  return { punten: (steam / 5) * max, max, label: `STEAM/innovatie beoordeeld op ${steam}/5 op basis van het schoolprofiel.` };
}

function scoreTekstKwaliteit(vacature, profiel) {
  const max = profiel.gewichten.vacaturetekst_kwaliteit;
  const tekst = (vacature.vacaturetekst || "").toLowerCase();
  const positief = POSITIEVE_TEKSTSIGNALEN.filter((w) => tekst.includes(w)).length;
  const negatief = NEGATIEVE_TEKSTSIGNALEN.filter((w) => tekst.includes(w)).length;
  const score = Math.max(0, Math.min(1, 0.5 + positief * 0.12 - negatief * 0.2));
  return { punten: max * score, max, label: "Toon van de vacaturetekst beoordeeld op basis van gebruikte signaalwoorden." };
}

/**
 * Berekent de matchscore voor één vacature, gegeven het profiel.
 * @returns {{totaal:number, deelscores:Array, pluspunten:string[], aandachtspunten:string[], risicos:string[], gespreksvragen:string[]}}
 */
function berekenMatchscore(vacature, profiel) {
  const onderdelen = [
    { key: "groep_match", titel: "Groep 5/6/7", ...scoreGroepMatch(vacature, profiel) },
    { key: "regio_reistijd", titel: "Regio & reistijd", ...scoreRegioReistijd(vacature, profiel) },
    { key: "ov_bereikbaarheid", titel: "OV-bereikbaarheid", ...scoreOv(vacature, profiel) },
    { key: "contract_vast", titel: "Vast contract", ...scoreContract(vacature, profiel) },
    { key: "dienstverband_fulltime", titel: "Fulltime", ...scoreFulltime(vacature, profiel) },
    { key: "begeleiding", titel: "Begeleiding", ...scoreBegeleiding(vacature, profiel) },
    { key: "schoolgrootte", titel: "Schoolgrootte", ...scoreSchoolgrootte(vacature, profiel) },
    { key: "parallelgroepen", titel: "Parallelgroepen", ...scoreParallel(vacature, profiel) },
    { key: "onderzoekend_leren", titel: "Onderzoekend leren", ...scoreOnderzoekend(vacature, profiel) },
    { key: "steam_innovatie", titel: "STEAM & innovatie", ...scoreSteam(vacature, profiel) },
    { key: "vacaturetekst_kwaliteit", titel: "Toon vacaturetekst", ...scoreTekstKwaliteit(vacature, profiel) },
  ];

  const totaalPunten = onderdelen.reduce((sum, o) => sum + o.punten, 0);
  const maxPunten = onderdelen.reduce((sum, o) => sum + o.max, 0);
  const totaal = Math.round((totaalPunten / maxPunten) * 100);

  const pluspunten = onderdelen
    .filter((o) => o.punten / o.max >= 0.75)
    .map((o) => o.label);

  const aandachtspunten = onderdelen
    .filter((o) => o.punten / o.max >= 0.35 && o.punten / o.max < 0.75)
    .map((o) => o.label);

  const risicos = onderdelen
    .filter((o) => o.punten / o.max < 0.35)
    .map((o) => o.label);

  const gespreksvragen = genereerGespreksvragen(onderdelen);

  return { totaal, deelscores: onderdelen, pluspunten, aandachtspunten, risicos, gespreksvragen };
}

function genereerGespreksvragen(onderdelen) {
  const vragen = [];
  const zwak = (key) => onderdelen.find((o) => o.key === key && o.punten / o.max < 0.6);

  if (zwak("begeleiding")) vragen.push("Hoe wordt een nieuwe leerkracht in de praktijk begeleid, en door wie?");
  if (zwak("contract_vast")) vragen.push("Wat is concreet het perspectief op een vaste aanstelling na dit contract?");
  if (zwak("parallelgroepen")) vragen.push("Hoe wordt er samengewerkt tussen leerkrachten van dezelfde jaargroep?");
  if (zwak("onderzoekend_leren")) vragen.push("Hoe krijgt onderzoekend leren concreet vorm in de dagelijkse lespraktijk?");
  if (zwak("steam_innovatie")) vragen.push("Welke ruimte is er voor STEAM, techniek of eigen innovatieve lesideeën?");
  if (zwak("ov_bereikbaarheid")) vragen.push("Zijn er afspraken mogelijk over werktijden in verband met de reistijd?");
  if (vragen.length === 0) vragen.push("Hoe ziet een gewone werkweek er hier in de praktijk uit?");
  return vragen;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { berekenMatchscore };
}
