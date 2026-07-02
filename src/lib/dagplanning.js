const db = require('../db');
const { isoWeekdag } = require('./datum');

const magGegenereerdWorden = db.prepare('SELECT 1 FROM dag_gegenereerd WHERE datum = ?');
const markeerGegenereerd = db.prepare('INSERT OR IGNORE INTO dag_gegenereerd (datum) VALUES (?)');
const sjabloonVoorWeekdag = db.prepare(
  'SELECT * FROM weekrooster_items WHERE weekdag = ? ORDER BY volgorde, starttijd'
);
const voegDagItemToe = db.prepare(
  `INSERT INTO dag_items (datum, starttijd, eindtijd, vak, lesdoel, notitie, volgorde, sjabloon_item_id)
   VALUES (@datum, @starttijd, @eindtijd, @vak, @lesdoel, @notitie, @volgorde, @sjabloon_item_id)`
);
const dagItemsVoorDatum = db.prepare('SELECT * FROM dag_items WHERE datum = ? ORDER BY volgorde, starttijd');

// Zorgt dat er voor de gegeven datum dagplanning-items bestaan: bij eerste bezoek
// worden ze gekopieerd vanuit het weekrooster-sjabloon. Latere aanpassingen raken
// alleen deze dag, niet het sjabloon. Weekenddagen krijgen geen items.
function zorgDatDagBestaat(datum) {
  if (magGegenereerdWorden.get(datum)) return;

  const weekdag = isoWeekdag(datum);
  const transactie = db.transaction(() => {
    if (weekdag <= 5) {
      const sjabloonItems = sjabloonVoorWeekdag.all(weekdag);
      for (const item of sjabloonItems) {
        voegDagItemToe.run({
          datum,
          starttijd: item.starttijd,
          eindtijd: item.eindtijd,
          vak: item.vak,
          lesdoel: item.lesdoel,
          notitie: item.notitie,
          volgorde: item.volgorde,
          sjabloon_item_id: item.id,
        });
      }
    }
    markeerGegenereerd.run(datum);
  });
  transactie();
}

function haalDagplanning(datum) {
  zorgDatDagBestaat(datum);
  return dagItemsVoorDatum.all(datum);
}

module.exports = { zorgDatDagBestaat, haalDagplanning };
