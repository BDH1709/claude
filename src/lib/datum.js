// Datumhelpers. We werken uitsluitend met lokale kalenderdatums (YYYY-MM-DD strings),
// om tijdzoneverwarring op de server te vermijden.

const DAGNAMEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MAANDNAMEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

function vandaag() {
  const nu = new Date();
  return toISODatum(nu);
}

function toISODatum(date) {
  const jaar = date.getFullYear();
  const maand = String(date.getMonth() + 1).padStart(2, '0');
  const dag = String(date.getDate()).padStart(2, '0');
  return `${jaar}-${maand}-${dag}`;
}

function parseISODatum(datumStr) {
  const [jaar, maand, dag] = datumStr.split('-').map(Number);
  return new Date(jaar, maand - 1, dag);
}

// ISO-weekdag: 1 = maandag ... 7 = zondag
function isoWeekdag(datumStr) {
  const date = parseISODatum(datumStr);
  const dag = date.getDay();
  return dag === 0 ? 7 : dag;
}

function addDagen(datumStr, aantal) {
  const date = parseISODatum(datumStr);
  date.setDate(date.getDate() + aantal);
  return toISODatum(date);
}

function beginVanWeek(datumStr) {
  const wd = isoWeekdag(datumStr);
  return addDagen(datumStr, -(wd - 1));
}

function formatteerDatumNL(datumStr, { metJaar = true } = {}) {
  const date = parseISODatum(datumStr);
  const dagnaam = DAGNAMEN[date.getDay()];
  const dag = date.getDate();
  const maand = MAANDNAMEN[date.getMonth()];
  return metJaar
    ? `${dagnaam} ${dag} ${maand} ${date.getFullYear()}`
    : `${dagnaam} ${dag} ${maand}`;
}

function isoWeekNummer(datumStr) {
  const date = parseISODatum(datumStr);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dagNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dagNr + 3);
  const eersteDonderdag = new Date(target.getFullYear(), 0, 4);
  const diff = target - eersteDonderdag;
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

module.exports = {
  DAGNAMEN,
  MAANDNAMEN,
  vandaag,
  toISODatum,
  parseISODatum,
  isoWeekdag,
  addDagen,
  beginVanWeek,
  formatteerDatumNL,
  isoWeekNummer,
};
