const express = require('express');
const db = require('../db');
const { VAKKEN } = require('../lib/vakken');
const { haalDagplanning } = require('../lib/dagplanning');
const {
  vandaag,
  isoWeekdag,
  addDagen,
  beginVanWeek,
  formatteerDatumNL,
  isoWeekNummer,
} = require('../lib/datum');

const router = express.Router();

const VAK_WAARDEN = Object.keys(VAKKEN);
const DAGNAMEN_KORT = ['', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

function valideerItemVelden(body) {
  const { starttijd, eindtijd, vak } = body;
  const tijdPatroon = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!tijdPatroon.test(starttijd) || !tijdPatroon.test(eindtijd)) return 'Ongeldige tijdnotatie (gebruik UU:MM).';
  if (!VAK_WAARDEN.includes(vak)) return 'Ongeldig vak.';
  return null;
}

// --- Weekrooster-sjabloon ---

router.get('/weekrooster', (req, res) => {
  const items = db.prepare('SELECT * FROM weekrooster_items ORDER BY weekdag, volgorde, starttijd').all();
  const perDag = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const item of items) perDag[item.weekdag].push(item);

  res.render('schedule/weekrooster', {
    title: 'Weekrooster-sjabloon',
    perDag,
    DAGNAMEN_KORT,
    VAKKEN,
    fout: req.query.fout || null,
  });
});

router.post('/weekrooster/item', (req, res) => {
  const { weekdag, starttijd, eindtijd, vak, lesdoel, notitie } = req.body;
  const fout = valideerItemVelden(req.body);
  if (fout) return res.redirect(`/weekrooster?fout=${encodeURIComponent(fout)}`);

  const maxVolgorde = db
    .prepare('SELECT COALESCE(MAX(volgorde), -1) AS m FROM weekrooster_items WHERE weekdag = ?')
    .get(weekdag).m;

  db.prepare(
    `INSERT INTO weekrooster_items (weekdag, starttijd, eindtijd, vak, lesdoel, notitie, volgorde)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(weekdag, starttijd, eindtijd, vak, lesdoel || null, notitie || null, maxVolgorde + 1);

  res.redirect('/weekrooster');
});

router.post('/weekrooster/item/:id/bewerken', (req, res) => {
  const item = db.prepare('SELECT * FROM weekrooster_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).render('error', { title: 'Niet gevonden', message: 'Roosteritem niet gevonden.' });

  const fout = valideerItemVelden(req.body);
  if (fout) return res.redirect(`/weekrooster?fout=${encodeURIComponent(fout)}`);

  const { starttijd, eindtijd, vak, lesdoel, notitie } = req.body;
  db.prepare(
    'UPDATE weekrooster_items SET starttijd = ?, eindtijd = ?, vak = ?, lesdoel = ?, notitie = ? WHERE id = ?'
  ).run(starttijd, eindtijd, vak, lesdoel || null, notitie || null, item.id);

  res.redirect('/weekrooster');
});

router.post('/weekrooster/item/:id/verwijderen', (req, res) => {
  db.prepare('DELETE FROM weekrooster_items WHERE id = ?').run(req.params.id);
  res.redirect('/weekrooster');
});

// --- Dagplanning ---

router.get('/dag/:datum', (req, res) => {
  const { datum } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return res.status(400).render('error', { title: 'Ongeldige datum', message: 'Ongeldige datumnotatie.' });
  }

  const items = haalDagplanning(datum);

  res.render('schedule/dag', {
    title: `Dagplanning ${formatteerDatumNL(datum)}`,
    datum,
    items,
    VAKKEN,
    datumLabel: formatteerDatumNL(datum),
    vorigeDag: addDagen(datum, -1),
    volgendeDag: addDagen(datum, 1),
    isVandaag: datum === vandaag(),
    weekendDag: isoWeekdag(datum) > 5,
    fout: req.query.fout || null,
  });
});

router.post('/dag/:datum/item', (req, res) => {
  const { datum } = req.params;
  const fout = valideerItemVelden(req.body);
  if (fout) return res.redirect(`/dag/${datum}?fout=${encodeURIComponent(fout)}`);

  const { starttijd, eindtijd, vak, lesdoel, notitie } = req.body;
  const maxVolgorde = db
    .prepare('SELECT COALESCE(MAX(volgorde), -1) AS m FROM dag_items WHERE datum = ?')
    .get(datum).m;

  db.prepare(
    `INSERT INTO dag_items (datum, starttijd, eindtijd, vak, lesdoel, notitie, volgorde, sjabloon_item_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(datum, starttijd, eindtijd, vak, lesdoel || null, notitie || null, maxVolgorde + 1);

  res.redirect(`/dag/${datum}`);
});

router.post('/dag/item/:id/bewerken', (req, res) => {
  const item = db.prepare('SELECT * FROM dag_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).render('error', { title: 'Niet gevonden', message: 'Dagplanning-item niet gevonden.' });

  const fout = valideerItemVelden(req.body);
  if (fout) return res.redirect(`/dag/${item.datum}?fout=${encodeURIComponent(fout)}`);

  const { starttijd, eindtijd, vak, lesdoel, notitie } = req.body;
  db.prepare(
    'UPDATE dag_items SET starttijd = ?, eindtijd = ?, vak = ?, lesdoel = ?, notitie = ? WHERE id = ?'
  ).run(starttijd, eindtijd, vak, lesdoel || null, notitie || null, item.id);

  res.redirect(`/dag/${item.datum}`);
});

router.post('/dag/item/:id/verwijderen', (req, res) => {
  const item = db.prepare('SELECT * FROM dag_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).render('error', { title: 'Niet gevonden', message: 'Dagplanning-item niet gevonden.' });
  db.prepare('DELETE FROM dag_items WHERE id = ?').run(item.id);
  res.redirect(`/dag/${item.datum}`);
});

// --- Weekoverzicht ---

router.get('/week', (req, res) => res.redirect(`/week/${vandaag()}`));

router.get('/week/:datum', (req, res) => {
  const { datum } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return res.status(400).render('error', { title: 'Ongeldige datum', message: 'Ongeldige datumnotatie.' });
  }

  const maandag = beginVanWeek(datum);
  const dagen = [];
  for (let i = 0; i < 5; i++) {
    const d = addDagen(maandag, i);
    dagen.push({
      datum: d,
      naam: DAGNAMEN_KORT[i + 1],
      isVandaag: d === vandaag(),
      items: haalDagplanning(d),
    });
  }

  res.render('schedule/week', {
    title: `Week ${isoWeekNummer(datum)}`,
    dagen,
    VAKKEN,
    weekNummer: isoWeekNummer(datum),
    vorigeWeek: addDagen(maandag, -7),
    volgendeWeek: addDagen(maandag, 7),
  });
});

module.exports = router;
