const express = require('express');
const db = require('../db');
const { VAKKEN } = require('../lib/vakken');
const { haalDagplanning } = require('../lib/dagplanning');
const { vandaag, addDagen, beginVanWeek, formatteerDatumNL, isoWeekNummer } = require('../lib/datum');

const router = express.Router();

const DAGNAMEN_KORT = ['', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

router.get('/', (req, res) => {
  const datumVandaag = vandaag();
  const dagItems = haalDagplanning(datumVandaag);

  const openTodos = db
    .prepare(
      `SELECT todos.*, leerlingen.roepnaam FROM todos
       LEFT JOIN leerlingen ON leerlingen.id = todos.leerling_id
       WHERE afgerond = 0
       ORDER BY (deadline IS NULL), deadline, todos.id
       LIMIT 8`
    )
    .all();
  const aantalOpenTodos = db.prepare('SELECT COUNT(*) AS n FROM todos WHERE afgerond = 0').get().n;

  // Aandachtspunten per leerling: leerlingen met minstens één open aandachtspunt,
  // plus hun meest recente notitie erbij als context.
  const leerlingenMetAandachtspunten = db
    .prepare(
      `SELECT l.id, l.roepnaam,
              (SELECT COUNT(*) FROM notities n WHERE n.leerling_id = l.id AND n.is_aandachtspunt = 1) AS aantal_aandachtspunten
       FROM leerlingen l
       WHERE l.gearchiveerd = 0
         AND EXISTS (SELECT 1 FROM notities n WHERE n.leerling_id = l.id AND n.is_aandachtspunt = 1)
       ORDER BY l.roepnaam COLLATE NOCASE`
    )
    .all();

  const laatsteNotitieStmt = db.prepare(
    'SELECT * FROM notities WHERE leerling_id = ? ORDER BY datum DESC, id DESC LIMIT 1'
  );
  const aandachtspuntenStmt = db.prepare(
    'SELECT * FROM notities WHERE leerling_id = ? AND is_aandachtspunt = 1 ORDER BY datum DESC, id DESC LIMIT 3'
  );

  const aandachtsKaarten = leerlingenMetAandachtspunten.map((l) => ({
    leerling: l,
    aandachtspunten: aandachtspuntenStmt.all(l.id),
    laatsteNotitie: laatsteNotitieStmt.get(l.id),
  }));

  const maandag = beginVanWeek(datumVandaag);
  const week = [];
  for (let i = 0; i < 5; i++) {
    const d = addDagen(maandag, i);
    week.push({
      datum: d,
      naam: DAGNAMEN_KORT[i + 1],
      isVandaag: d === datumVandaag,
      items: haalDagplanning(d),
    });
  }

  res.render('dashboard', {
    title: 'Dashboard',
    datumVandaag,
    datumLabel: formatteerDatumNL(datumVandaag),
    dagItems,
    openTodos,
    aantalOpenTodos,
    aandachtsKaarten,
    week,
    weekNummer: isoWeekNummer(datumVandaag),
    VAKKEN,
  });
});

module.exports = router;
