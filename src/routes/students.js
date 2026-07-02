const express = require('express');
const db = require('../db');
const { NIVEAUS, VAKKEN } = require('../lib/vakken');

const router = express.Router();

const NIVEAU_WAARDEN = Object.keys(NIVEAUS);

function schoonNiveau(waarde) {
  return NIVEAU_WAARDEN.includes(waarde) ? waarde : null;
}

function schoonVerjaardag(dag, maand) {
  const d = parseInt(dag, 10);
  const m = parseInt(maand, 10);
  if (!d || !m || d < 1 || d > 31 || m < 1 || m > 12) return { dag: null, maand: null };
  return { dag: d, maand: m };
}

router.get('/leerlingen', (req, res) => {
  const toonGearchiveerd = req.query.gearchiveerd === '1';
  const leerlingen = db
    .prepare('SELECT * FROM leerlingen WHERE gearchiveerd = ? ORDER BY roepnaam COLLATE NOCASE')
    .all(toonGearchiveerd ? 1 : 0);
  res.render('students/list', {
    title: 'Leerlingen',
    leerlingen,
    toonGearchiveerd,
    NIVEAUS,
    VAKKEN,
  });
});

router.get('/leerlingen/nieuw', (req, res) => {
  res.render('students/form', {
    title: 'Nieuwe leerling',
    leerling: null,
    NIVEAUS,
    fout: null,
  });
});

router.post('/leerlingen/nieuw', (req, res) => {
  const { roepnaam, groep, niveau_rekenen, niveau_taal, niveau_wereldorientatie, verjaardag_dag, verjaardag_maand } = req.body;

  if (!roepnaam || !roepnaam.trim()) {
    return res.status(400).render('students/form', {
      title: 'Nieuwe leerling',
      leerling: req.body,
      NIVEAUS,
      fout: 'Roepnaam is verplicht.',
    });
  }

  const { dag, maand } = schoonVerjaardag(verjaardag_dag, verjaardag_maand);

  db.prepare(
    `INSERT INTO leerlingen (roepnaam, groep, niveau_rekenen, niveau_taal, niveau_wereldorientatie, verjaardag_dag, verjaardag_maand)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    roepnaam.trim(),
    (groep || '7').trim(),
    schoonNiveau(niveau_rekenen),
    schoonNiveau(niveau_taal),
    schoonNiveau(niveau_wereldorientatie),
    dag,
    maand
  );

  res.redirect('/leerlingen');
});

function haalLeerlingOf404(req, res) {
  const leerling = db.prepare('SELECT * FROM leerlingen WHERE id = ?').get(req.params.id);
  if (!leerling) {
    res.status(404).render('error', { title: 'Niet gevonden', message: 'Leerling niet gevonden.' });
    return null;
  }
  return leerling;
}

router.get('/leerlingen/:id', (req, res) => {
  const leerling = haalLeerlingOf404(req, res);
  if (!leerling) return;

  const notities = db
    .prepare('SELECT * FROM notities WHERE leerling_id = ? ORDER BY datum DESC, id DESC LIMIT 50')
    .all(leerling.id);

  res.render('students/detail', {
    title: leerling.roepnaam,
    leerling,
    notities,
    NIVEAUS,
    VAKKEN,
  });
});

router.get('/leerlingen/:id/bewerken', (req, res) => {
  const leerling = haalLeerlingOf404(req, res);
  if (!leerling) return;
  res.render('students/form', {
    title: `${leerling.roepnaam} bewerken`,
    leerling,
    NIVEAUS,
    fout: null,
  });
});

router.post('/leerlingen/:id/bewerken', (req, res) => {
  const leerling = haalLeerlingOf404(req, res);
  if (!leerling) return;

  const { roepnaam, groep, niveau_rekenen, niveau_taal, niveau_wereldorientatie, verjaardag_dag, verjaardag_maand } = req.body;

  if (!roepnaam || !roepnaam.trim()) {
    return res.status(400).render('students/form', {
      title: `${leerling.roepnaam} bewerken`,
      leerling: { ...leerling, ...req.body },
      NIVEAUS,
      fout: 'Roepnaam is verplicht.',
    });
  }

  const { dag, maand } = schoonVerjaardag(verjaardag_dag, verjaardag_maand);

  db.prepare(
    `UPDATE leerlingen SET roepnaam = ?, groep = ?, niveau_rekenen = ?, niveau_taal = ?, niveau_wereldorientatie = ?,
     verjaardag_dag = ?, verjaardag_maand = ? WHERE id = ?`
  ).run(
    roepnaam.trim(),
    (groep || '7').trim(),
    schoonNiveau(niveau_rekenen),
    schoonNiveau(niveau_taal),
    schoonNiveau(niveau_wereldorientatie),
    dag,
    maand,
    leerling.id
  );

  res.redirect(`/leerlingen/${leerling.id}`);
});

router.post('/leerlingen/:id/archiveren', (req, res) => {
  const leerling = haalLeerlingOf404(req, res);
  if (!leerling) return;
  db.prepare('UPDATE leerlingen SET gearchiveerd = 1 WHERE id = ?').run(leerling.id);
  res.redirect('/leerlingen');
});

router.post('/leerlingen/:id/dearchiveren', (req, res) => {
  const leerling = haalLeerlingOf404(req, res);
  if (!leerling) return;
  db.prepare('UPDATE leerlingen SET gearchiveerd = 0 WHERE id = ?').run(leerling.id);
  res.redirect('/leerlingen?gearchiveerd=1');
});

// --- Minimale notities: fundament voor de volledige notitiemodule in fase 3. ---

router.post('/leerlingen/:id/notities', (req, res) => {
  const leerling = haalLeerlingOf404(req, res);
  if (!leerling) return;

  const tekst = (req.body.tekst || '').trim();
  if (!tekst) return res.redirect(`/leerlingen/${leerling.id}`);

  const isAandachtspunt = req.body.is_aandachtspunt === '1' ? 1 : 0;

  db.prepare(
    'INSERT INTO notities (leerling_id, tekst, is_aandachtspunt) VALUES (?, ?, ?)'
  ).run(leerling.id, tekst, isAandachtspunt);

  res.redirect(req.get('Referrer') && req.get('Referrer').includes('/leerlingen/') ? req.get('Referrer') : `/leerlingen/${leerling.id}`);
});

router.post('/notities/:id/aandachtspunt', (req, res) => {
  const notitie = db.prepare('SELECT * FROM notities WHERE id = ?').get(req.params.id);
  if (!notitie) return res.status(404).render('error', { title: 'Niet gevonden', message: 'Notitie niet gevonden.' });
  db.prepare('UPDATE notities SET is_aandachtspunt = ? WHERE id = ?').run(notitie.is_aandachtspunt ? 0 : 1, notitie.id);
  res.redirect(`/leerlingen/${notitie.leerling_id}`);
});

router.post('/notities/:id/verwijderen', (req, res) => {
  const notitie = db.prepare('SELECT * FROM notities WHERE id = ?').get(req.params.id);
  if (!notitie) return res.status(404).render('error', { title: 'Niet gevonden', message: 'Notitie niet gevonden.' });
  db.prepare('DELETE FROM notities WHERE id = ?').run(notitie.id);
  res.redirect(`/leerlingen/${notitie.leerling_id}`);
});

module.exports = router;
