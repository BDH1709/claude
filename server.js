'use strict';

const express = require('express');
const path    = require('path');
const crypto  = require('crypto');
const fs      = require('fs');

const app     = express();
const PORT    = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'sociogram.db');

// ---------------------------------------------------------------------------
// sql.js helpers (pure-JS SQLite, no native compilation needed)
// ---------------------------------------------------------------------------
let db;

function dbAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function dbRun(sql, params) {
  db.run(sql, params || []);
}

function lastId() {
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

function save() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function dbTransaction(fn) {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    save();
    return result;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------
async function initDb() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS sociograms (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      token         TEXT    NOT NULL UNIQUE,
      title         TEXT    NOT NULL,
      class_name    TEXT    NOT NULL,
      max_positive  INTEGER NOT NULL DEFAULT 3,
      max_negative  INTEGER NOT NULL DEFAULT 1,
      allow_negative INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sociogram_id INTEGER NOT NULL,
      name         TEXT    NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS responses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sociogram_id INTEGER NOT NULL,
      from_student INTEGER NOT NULL,
      to_student   INTEGER NOT NULL,
      choice_type  TEXT    NOT NULL,
      submitted_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sociogram_id INTEGER NOT NULL,
      student_id   INTEGER NOT NULL,
      submitted_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  save();
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateToken() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ---------------------------------------------------------------------------
// API – Sociograms (teacher)
// ---------------------------------------------------------------------------

// Create
app.post('/api/sociograms', (req, res) => {
  const { title, class_name, students, max_positive = 3, max_negative = 1, allow_negative = true } = req.body;

  if (!title || !class_name || !Array.isArray(students) || students.length < 2) {
    return res.status(400).json({ error: 'Titel, klasnaam en minimaal 2 leerlingen zijn verplicht.' });
  }

  const cleanStudents = students.map(s => s.trim()).filter(Boolean);
  if (cleanStudents.length < 2) return res.status(400).json({ error: 'Minimaal 2 leerlingen vereist.' });

  let token;
  for (let i = 0; i < 10; i++) {
    const candidate = generateToken();
    if (!dbGet('SELECT 1 FROM sociograms WHERE token = ?', [candidate])) { token = candidate; break; }
  }
  if (!token) return res.status(500).json({ error: 'Token generatie mislukt.' });

  const sociogramId = dbTransaction(() => {
    dbRun(
      'INSERT INTO sociograms (token, title, class_name, max_positive, max_negative, allow_negative) VALUES (?,?,?,?,?,?)',
      [token, title, class_name, max_positive, max_negative, allow_negative ? 1 : 0]
    );
    const id = lastId();
    cleanStudents.forEach((name, idx) => {
      dbRun('INSERT INTO students (sociogram_id, name, sort_order) VALUES (?,?,?)', [id, name, idx]);
    });
    return id;
  });

  res.json({ id: sociogramId, token });
});

// List all
app.get('/api/sociograms', (req, res) => {
  const rows = dbAll(`
    SELECT s.*,
      (SELECT COUNT(*) FROM students st WHERE st.sociogram_id = s.id) as student_count,
      (SELECT COUNT(*) FROM submissions sub WHERE sub.sociogram_id = s.id) as response_count
    FROM sociograms s ORDER BY s.created_at DESC
  `);
  res.json(rows);
});

// Get single (results page)
app.get('/api/sociograms/:token', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  const students    = dbAll('SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name', [sg.id]);
  const submissions = dbAll('SELECT student_id, submitted_at FROM submissions WHERE sociogram_id = ?', [sg.id]);
  const responses   = dbAll('SELECT from_student, to_student, choice_type FROM responses WHERE sociogram_id = ?', [sg.id]);
  const submittedIds = submissions.map(s => s.student_id);

  res.json({ sociogram: sg, students, submissions, responses, submittedIds });
});

// Delete
app.delete('/api/sociograms/:token', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  dbTransaction(() => {
    dbRun('DELETE FROM responses   WHERE sociogram_id = ?', [sg.id]);
    dbRun('DELETE FROM submissions WHERE sociogram_id = ?', [sg.id]);
    dbRun('DELETE FROM students    WHERE sociogram_id = ?', [sg.id]);
    dbRun('DELETE FROM sociograms  WHERE id = ?',           [sg.id]);
  });

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// API – Student side
// ---------------------------------------------------------------------------

// Get sociogram info for student form
app.get('/api/student/:token', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Sociogram niet gevonden.' });

  const students = dbAll('SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name', [sg.id]);

  res.json({
    id: sg.id,
    title: sg.title,
    class_name: sg.class_name,
    max_positive: sg.max_positive,
    max_negative: sg.max_negative,
    allow_negative: sg.allow_negative,
    students
  });
});

// Check if already submitted
app.get('/api/student/:token/check/:studentId', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });
  const sub = dbGet('SELECT 1 FROM submissions WHERE sociogram_id = ? AND student_id = ?', [sg.id, req.params.studentId]);
  res.json({ submitted: !!sub });
});

// Submit student response
app.post('/api/student/:token/submit', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Sociogram niet gevonden.' });

  const { student_id, positive_choices = [], negative_choices = [] } = req.body;
  if (!student_id) return res.status(400).json({ error: 'student_id verplicht.' });

  const student = dbGet('SELECT * FROM students WHERE id = ? AND sociogram_id = ?', [student_id, sg.id]);
  if (!student) return res.status(400).json({ error: 'Leerling niet gevonden.' });

  if (dbGet('SELECT 1 FROM submissions WHERE sociogram_id = ? AND student_id = ?', [sg.id, student_id])) {
    return res.status(400).json({ error: 'Al ingevuld.' });
  }

  if (positive_choices.length > sg.max_positive)
    return res.status(400).json({ error: `Maximaal ${sg.max_positive} positieve keuzes.` });
  if (sg.allow_negative && negative_choices.length > sg.max_negative)
    return res.status(400).json({ error: `Maximaal ${sg.max_negative} negatieve keuzes.` });

  const allIds = [...positive_choices, ...negative_choices].map(Number);
  if (allIds.includes(Number(student_id)))
    return res.status(400).json({ error: 'Je kunt jezelf niet kiezen.' });

  dbTransaction(() => {
    const now = new Date().toISOString();
    positive_choices.forEach(toId => {
      if (!dbGet('SELECT 1 FROM responses WHERE sociogram_id=? AND from_student=? AND to_student=? AND choice_type=?',
          [sg.id, student_id, toId, 'positive'])) {
        dbRun('INSERT INTO responses (sociogram_id, from_student, to_student, choice_type, submitted_at) VALUES (?,?,?,?,?)',
          [sg.id, student_id, toId, 'positive', now]);
      }
    });
    if (sg.allow_negative) {
      negative_choices.forEach(toId => {
        if (!dbGet('SELECT 1 FROM responses WHERE sociogram_id=? AND from_student=? AND to_student=? AND choice_type=?',
            [sg.id, student_id, toId, 'negative'])) {
          dbRun('INSERT INTO responses (sociogram_id, from_student, to_student, choice_type, submitted_at) VALUES (?,?,?,?,?)',
            [sg.id, student_id, toId, 'negative', now]);
        }
      });
    }
    dbRun('INSERT INTO submissions (sociogram_id, student_id, submitted_at) VALUES (?,?,?)',
      [sg.id, student_id, now]);
  });

  res.json({ ok: true, name: student.name });
});

// ---------------------------------------------------------------------------
// API – CSV Export
// ---------------------------------------------------------------------------
app.get('/api/sociograms/:token/export', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  const students    = dbAll('SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name', [sg.id]);
  const responses   = dbAll('SELECT from_student, to_student, choice_type FROM responses WHERE sociogram_id = ?', [sg.id]);
  const submissions = dbAll('SELECT student_id FROM submissions WHERE sociogram_id = ?', [sg.id]);
  const submittedSet = new Set(submissions.map(s => s.student_id));
  const studentMap = {};
  students.forEach(s => { studentMap[s.id] = s.name; });

  const posIn = {}, negIn = {};
  students.forEach(s => { posIn[s.id] = 0; negIn[s.id] = 0; });
  responses.forEach(r => {
    if (r.choice_type === 'positive') posIn[r.to_student] = (posIn[r.to_student] || 0) + 1;
    else negIn[r.to_student] = (negIn[r.to_student] || 0) + 1;
  });

  let csv = 'Naam,Ingediend,Positieve keuzes,Negatieve keuzes,Status\n';
  students.forEach(s => {
    const pos = posIn[s.id] || 0, neg = negIn[s.id] || 0, net = pos - neg;
    let status = 'Gemiddeld';
    if (pos === 0 && neg === 0 && submittedSet.size > 0) status = 'Geïsoleerd';
    else if (net >= 3) status = 'Ster';
    else if (net <= -2) status = 'Afgewezen';
    else if (pos <= 1 && neg === 0) status = 'Verwaarloosd';
    csv += `"${s.name}",${submittedSet.has(s.id) ? 'Ja' : 'Nee'},${pos},${neg},"${status}"\n`;
  });

  csv += '\nKeuzes\nVan,Naar,Type\n';
  responses.forEach(r => {
    csv += `"${studentMap[r.from_student]}","${studentMap[r.to_student]}","${r.choice_type === 'positive' ? 'Positief' : 'Negatief'}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sociogram-${sg.token}.csv"`);
  res.send('﻿' + csv);
});

// ---------------------------------------------------------------------------
// Catch-all → SPA
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Sociogram draait op http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database fout:', err);
  process.exit(1);
});
