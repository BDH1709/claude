'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'sociogram.db');

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sociograms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT    NOT NULL UNIQUE,
    title       TEXT    NOT NULL,
    class_name  TEXT    NOT NULL,
    max_positive INTEGER NOT NULL DEFAULT 3,
    max_negative INTEGER NOT NULL DEFAULT 1,
    allow_negative INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    sociogram_id  INTEGER NOT NULL REFERENCES sociograms(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS responses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sociogram_id INTEGER NOT NULL REFERENCES sociograms(id) ON DELETE CASCADE,
    from_student INTEGER NOT NULL REFERENCES students(id),
    to_student   INTEGER NOT NULL REFERENCES students(id),
    choice_type  TEXT    NOT NULL CHECK(choice_type IN ('positive','negative')),
    submitted_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(sociogram_id, from_student, to_student, choice_type)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sociogram_id INTEGER NOT NULL REFERENCES sociograms(id) ON DELETE CASCADE,
    student_id   INTEGER NOT NULL REFERENCES students(id),
    submitted_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(sociogram_id, student_id)
  );
`);

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

// Create new sociogram
app.post('/api/sociograms', (req, res) => {
  const { title, class_name, students, max_positive = 3, max_negative = 1, allow_negative = true } = req.body;

  if (!title || !class_name || !Array.isArray(students) || students.length < 2) {
    return res.status(400).json({ error: 'Titel, klasnaam en minimaal 2 leerlingen zijn verplicht.' });
  }

  const cleanStudents = students.map(s => s.trim()).filter(Boolean);
  if (cleanStudents.length < 2) {
    return res.status(400).json({ error: 'Minimaal 2 leerlingen vereist.' });
  }

  let token;
  // Ensure uniqueness
  for (let i = 0; i < 10; i++) {
    const candidate = generateToken();
    const exists = db.prepare('SELECT 1 FROM sociograms WHERE token = ?').get(candidate);
    if (!exists) { token = candidate; break; }
  }
  if (!token) return res.status(500).json({ error: 'Token generatie mislukt.' });

  const insertSociogram = db.prepare(
    'INSERT INTO sociograms (token, title, class_name, max_positive, max_negative, allow_negative) VALUES (?,?,?,?,?,?)'
  );
  const insertStudent = db.prepare(
    'INSERT INTO students (sociogram_id, name, sort_order) VALUES (?,?,?)'
  );

  const runAll = db.transaction(() => {
    const result = insertSociogram.run(token, title, class_name, max_positive, max_negative, allow_negative ? 1 : 0);
    const sociogramId = result.lastInsertRowid;
    cleanStudents.forEach((name, idx) => {
      insertStudent.run(sociogramId, name, idx);
    });
    return sociogramId;
  });

  const sociogramId = runAll();
  res.json({ id: sociogramId, token });
});

// List all sociograms
app.get('/api/sociograms', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM students st WHERE st.sociogram_id = s.id) as student_count,
      (SELECT COUNT(*) FROM submissions sub WHERE sub.sociogram_id = s.id) as response_count
    FROM sociograms s
    ORDER BY s.created_at DESC
  `).all();
  res.json(rows);
});

// Get single sociogram (for teacher results page)
app.get('/api/sociograms/:token', (req, res) => {
  const sg = db.prepare('SELECT * FROM sociograms WHERE token = ?').get(req.params.token);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  const students = db.prepare(
    'SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name'
  ).all(sg.id);

  const submissions = db.prepare(
    'SELECT student_id, submitted_at FROM submissions WHERE sociogram_id = ?'
  ).all(sg.id);
  const submittedIds = new Set(submissions.map(s => s.student_id));

  const responses = db.prepare(
    'SELECT r.from_student, r.to_student, r.choice_type FROM responses r WHERE r.sociogram_id = ?'
  ).all(sg.id);

  res.json({ sociogram: sg, students, submissions, responses, submittedIds: [...submittedIds] });
});

// Delete sociogram
app.delete('/api/sociograms/:token', (req, res) => {
  const sg = db.prepare('SELECT * FROM sociograms WHERE token = ?').get(req.params.token);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });
  db.prepare('DELETE FROM sociograms WHERE id = ?').run(sg.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// API – Student side
// ---------------------------------------------------------------------------

// Get sociogram info for student form (by token)
app.get('/api/student/:token', (req, res) => {
  const sg = db.prepare('SELECT * FROM sociograms WHERE token = ?').get(req.params.token);
  if (!sg) return res.status(404).json({ error: 'Sociogram niet gevonden.' });

  const students = db.prepare(
    'SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name'
  ).all(sg.id);

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

// Check if student already submitted
app.get('/api/student/:token/check/:studentId', (req, res) => {
  const sg = db.prepare('SELECT * FROM sociograms WHERE token = ?').get(req.params.token);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });
  const sub = db.prepare(
    'SELECT 1 FROM submissions WHERE sociogram_id = ? AND student_id = ?'
  ).get(sg.id, req.params.studentId);
  res.json({ submitted: !!sub });
});

// Submit student response
app.post('/api/student/:token/submit', (req, res) => {
  const sg = db.prepare('SELECT * FROM sociograms WHERE token = ?').get(req.params.token);
  if (!sg) return res.status(404).json({ error: 'Sociogram niet gevonden.' });

  const { student_id, positive_choices = [], negative_choices = [] } = req.body;

  if (!student_id) return res.status(400).json({ error: 'student_id verplicht.' });

  // Validate student belongs to this sociogram
  const student = db.prepare(
    'SELECT * FROM students WHERE id = ? AND sociogram_id = ?'
  ).get(student_id, sg.id);
  if (!student) return res.status(400).json({ error: 'Leerling niet gevonden.' });

  // Check already submitted
  const alreadySubmitted = db.prepare(
    'SELECT 1 FROM submissions WHERE sociogram_id = ? AND student_id = ?'
  ).get(sg.id, student_id);
  if (alreadySubmitted) return res.status(400).json({ error: 'Al ingevuld.' });

  // Validate counts
  if (positive_choices.length > sg.max_positive) {
    return res.status(400).json({ error: `Maximaal ${sg.max_positive} positieve keuzes.` });
  }
  if (sg.allow_negative && negative_choices.length > sg.max_negative) {
    return res.status(400).json({ error: `Maximaal ${sg.max_negative} negatieve keuzes.` });
  }

  // No self-selection, no overlap
  const allChoices = [...positive_choices, ...negative_choices];
  if (allChoices.includes(parseInt(student_id))) {
    return res.status(400).json({ error: 'Je kunt jezelf niet kiezen.' });
  }

  const insertResponse = db.prepare(
    'INSERT OR IGNORE INTO responses (sociogram_id, from_student, to_student, choice_type) VALUES (?,?,?,?)'
  );
  const insertSubmission = db.prepare(
    'INSERT INTO submissions (sociogram_id, student_id) VALUES (?,?)'
  );

  const runAll = db.transaction(() => {
    positive_choices.forEach(toId => {
      insertResponse.run(sg.id, student_id, toId, 'positive');
    });
    if (sg.allow_negative) {
      negative_choices.forEach(toId => {
        insertResponse.run(sg.id, student_id, toId, 'negative');
      });
    }
    insertSubmission.run(sg.id, student_id);
  });

  runAll();
  res.json({ ok: true, name: student.name });
});

// ---------------------------------------------------------------------------
// API – Export CSV
// ---------------------------------------------------------------------------
app.get('/api/sociograms/:token/export', (req, res) => {
  const sg = db.prepare('SELECT * FROM sociograms WHERE token = ?').get(req.params.token);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  const students = db.prepare(
    'SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name'
  ).all(sg.id);

  const responses = db.prepare(
    'SELECT r.from_student, r.to_student, r.choice_type FROM responses r WHERE r.sociogram_id = ?'
  ).all(sg.id);

  const submissions = db.prepare(
    'SELECT student_id FROM submissions WHERE sociogram_id = ?'
  ).all(sg.id);
  const submittedSet = new Set(submissions.map(s => s.student_id));

  const studentMap = {};
  students.forEach(s => { studentMap[s.id] = s.name; });

  // Build adjacency for analysis
  const positiveIn = {};
  const negativeIn = {};
  students.forEach(s => { positiveIn[s.id] = 0; negativeIn[s.id] = 0; });
  responses.forEach(r => {
    if (r.choice_type === 'positive') positiveIn[r.to_student] = (positiveIn[r.to_student] || 0) + 1;
    else negativeIn[r.to_student] = (negativeIn[r.to_student] || 0) + 1;
  });

  // Header
  let csv = 'Naam,Ingediend,Positieve keuzes ontvangen,Negatieve keuzes ontvangen,Sociometrische status\n';
  students.forEach(s => {
    const posScore = positiveIn[s.id] || 0;
    const negScore = negativeIn[s.id] || 0;
    const net = posScore - negScore;
    let status = 'Gemiddeld';
    if (posScore === 0 && negScore === 0 && submittedSet.size > 0) status = 'Geïsoleerd';
    else if (net >= 3) status = 'Ster';
    else if (net <= -2) status = 'Afgewezen';
    else if (posScore <= 1 && negScore === 0) status = 'Verwaarloosd';

    csv += `"${s.name}",${submittedSet.has(s.id) ? 'Ja' : 'Nee'},${posScore},${negScore},"${status}"\n`;
  });

  csv += '\nKeuzes detail\n';
  csv += 'Van,Naar,Type\n';
  responses.forEach(r => {
    csv += `"${studentMap[r.from_student]}","${studentMap[r.to_student]}","${r.choice_type === 'positive' ? 'Positief' : 'Negatief'}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sociogram-${sg.token}.csv"`);
  res.send('﻿' + csv); // BOM for Excel
});

// ---------------------------------------------------------------------------
// Catch-all: serve index.html for unknown routes (SPA style)
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Sociogram server draait op http://localhost:${PORT}`);
});
