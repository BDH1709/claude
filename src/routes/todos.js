const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/todos', (req, res) => {
  const open = db
    .prepare(
      `SELECT todos.*, leerlingen.roepnaam FROM todos
       LEFT JOIN leerlingen ON leerlingen.id = todos.leerling_id
       WHERE afgerond = 0
       ORDER BY (deadline IS NULL), deadline, todos.id`
    )
    .all();
  const afgerond = db
    .prepare(
      `SELECT todos.*, leerlingen.roepnaam FROM todos
       LEFT JOIN leerlingen ON leerlingen.id = todos.leerling_id
       WHERE afgerond = 1
       ORDER BY afgerond_op DESC LIMIT 50`
    )
    .all();
  const leerlingen = db
    .prepare('SELECT id, roepnaam FROM leerlingen WHERE gearchiveerd = 0 ORDER BY roepnaam COLLATE NOCASE')
    .all();

  res.render('todos/list', { title: "To-do's", open, afgerond, leerlingen });
});

router.post('/todos', (req, res) => {
  const { titel, omschrijving, deadline, leerling_id } = req.body;
  if (!titel || !titel.trim()) return res.redirect('/todos');

  db.prepare(
    'INSERT INTO todos (titel, omschrijving, deadline, leerling_id) VALUES (?, ?, ?, ?)'
  ).run(titel.trim(), omschrijving || null, deadline || null, leerling_id || null);

  res.redirect(req.get('Referrer') || '/todos');
});

router.post('/todos/:id/afronden', (req, res) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!todo) return res.status(404).render('error', { title: 'Niet gevonden', message: 'Actie niet gevonden.' });

  const nieuweStatus = todo.afgerond ? 0 : 1;
  db.prepare('UPDATE todos SET afgerond = ?, afgerond_op = ? WHERE id = ?').run(
    nieuweStatus,
    nieuweStatus ? new Date().toISOString() : null,
    todo.id
  );

  res.redirect(req.get('Referrer') || '/todos');
});

router.post('/todos/:id/verwijderen', (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.redirect(req.get('Referrer') || '/todos');
});

module.exports = router;
