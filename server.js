'use strict';

const express = require('express');
const path    = require('path');
const crypto  = require('crypto');
const fs      = require('fs');

const app     = express();
const PORT    = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'sociogram.db');

// ---------------------------------------------------------------------------
// sql.js helpers
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
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      token          TEXT    NOT NULL UNIQUE,
      title          TEXT    NOT NULL,
      class_name     TEXT    NOT NULL,
      max_positive   INTEGER NOT NULL DEFAULT 3,
      max_negative   INTEGER NOT NULL DEFAULT 1,
      allow_negative INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
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
      choice_type  TEXT    NOT NULL CHECK(choice_type IN ('positive','negative')),
      submitted_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(sociogram_id, from_student, to_student, choice_type)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sociogram_id INTEGER NOT NULL,
      student_id   INTEGER NOT NULL,
      submitted_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(sociogram_id, student_id)
    );
  `);

  save();
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------
function toInt(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

function toIntArray(arr) {
  if (!Array.isArray(arr)) return null;
  const result = arr.map(v => toInt(v));
  if (result.some(v => v === null)) return null;
  return result;
}

// ---------------------------------------------------------------------------
// Server-Sent Events – real-time updates for results page
// ---------------------------------------------------------------------------
const sseClients = new Map(); // token → Set of res objects

function sseNotify(token) {
  const clients = sseClients.get(token);
  if (!clients || clients.size === 0) return;
  const msg = `data: ${JSON.stringify({ type: 'update', ts: Date.now() })}\n\n`;
  clients.forEach(client => {
    try { client.write(msg); } catch (_) { clients.delete(client); }
  });
}

app.get('/api/sociograms/:token/events', (req, res) => {
  const token = req.params.token;
  const sg = dbGet('SELECT id FROM sociograms WHERE token = ?', [token]);
  if (!sg) { res.status(404).end(); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  res.write(': connected\n\n');

  if (!sseClients.has(token)) sseClients.set(token, new Set());
  sseClients.get(token).add(res);

  // Heartbeat every 25s to keep connection alive
  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(hb); }
  }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    sseClients.get(token)?.delete(res);
  });
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateToken() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function csvEscape(val) {
  return String(val).replace(/"/g, '""');
}

// ---------------------------------------------------------------------------
// API – Sociograms (teacher)
// ---------------------------------------------------------------------------

app.post('/api/sociograms', (req, res) => {
  const { title, class_name, students, max_positive = 3, max_negative = 1, allow_negative = true } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0)
    return res.status(400).json({ error: 'Titel is verplicht.' });
  if (!class_name || typeof class_name !== 'string' || class_name.trim().length === 0)
    return res.status(400).json({ error: 'Klasnaam is verplicht.' });
  if (!Array.isArray(students))
    return res.status(400).json({ error: 'Leerlingenlijst is verplicht.' });

  const cleanStudents = students.map(s => String(s).trim()).filter(Boolean);
  if (cleanStudents.length < 2)
    return res.status(400).json({ error: 'Minimaal 2 leerlingen vereist.' });
  if (cleanStudents.length > 60)
    return res.status(400).json({ error: 'Maximaal 60 leerlingen per sociogram.' });

  const maxPos = Math.min(Math.max(toInt(max_positive) ?? 3, 1), 10);
  const maxNeg = Math.min(Math.max(toInt(max_negative) ?? 1, 1), 5);

  let token;
  for (let i = 0; i < 10; i++) {
    const candidate = generateToken();
    if (!dbGet('SELECT 1 FROM sociograms WHERE token = ?', [candidate])) { token = candidate; break; }
  }
  if (!token) return res.status(500).json({ error: 'Token generatie mislukt.' });

  const sociogramId = dbTransaction(() => {
    dbRun(
      'INSERT INTO sociograms (token, title, class_name, max_positive, max_negative, allow_negative) VALUES (?,?,?,?,?,?)',
      [token, title.trim(), class_name.trim(), maxPos, maxNeg, allow_negative ? 1 : 0]
    );
    const id = lastId();
    cleanStudents.forEach((name, idx) => {
      dbRun('INSERT INTO students (sociogram_id, name, sort_order) VALUES (?,?,?)', [id, name, idx]);
    });
    return id;
  });

  res.json({ id: sociogramId, token });
});

app.get('/api/sociograms', (req, res) => {
  const rows = dbAll(`
    SELECT s.*,
      (SELECT COUNT(*) FROM students  st  WHERE st.sociogram_id  = s.id) AS student_count,
      (SELECT COUNT(*) FROM submissions sub WHERE sub.sociogram_id = s.id) AS response_count
    FROM sociograms s ORDER BY s.created_at DESC
  `);
  res.json(rows);
});

app.get('/api/sociograms/:token', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  const students    = dbAll('SELECT * FROM students WHERE sociogram_id = ? ORDER BY sort_order, name', [sg.id]);
  const submissions = dbAll('SELECT student_id, submitted_at FROM submissions WHERE sociogram_id = ?', [sg.id]);
  const responses   = dbAll('SELECT from_student, to_student, choice_type FROM responses WHERE sociogram_id = ?', [sg.id]);
  // Normalise to numbers so frontend Set.has() works correctly
  const submittedIds = submissions.map(s => Number(s.student_id));

  res.json({ sociogram: sg, students, submissions, responses, submittedIds });
});

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

app.get('/api/student/:token/check/:studentId', (req, res) => {
  const studentId = toInt(req.params.studentId);
  if (studentId === null) return res.status(400).json({ error: 'Ongeldig leerling-ID.' });

  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Niet gevonden.' });

  const sub = dbGet('SELECT 1 FROM submissions WHERE sociogram_id = ? AND student_id = ?', [sg.id, studentId]);
  res.json({ submitted: !!sub });
});

app.post('/api/student/:token/submit', (req, res) => {
  const sg = dbGet('SELECT * FROM sociograms WHERE token = ?', [req.params.token]);
  if (!sg) return res.status(404).json({ error: 'Sociogram niet gevonden.' });

  // Validate and coerce all IDs to integers
  const studentId = toInt(req.body.student_id);
  if (studentId === null) return res.status(400).json({ error: 'Ongeldig student_id.' });

  const positiveChoices = toIntArray(req.body.positive_choices ?? []);
  const negativeChoices = toIntArray(req.body.negative_choices ?? []);
  if (positiveChoices === null || negativeChoices === null)
    return res.status(400).json({ error: 'Ongeldige keuze-IDs.' });

  const student = dbGet('SELECT * FROM students WHERE id = ? AND sociogram_id = ?', [studentId, sg.id]);
  if (!student) return res.status(400).json({ error: 'Leerling niet gevonden.' });

  if (dbGet('SELECT 1 FROM submissions WHERE sociogram_id = ? AND student_id = ?', [sg.id, studentId]))
    return res.status(400).json({ error: 'Al ingevuld.' });

  if (positiveChoices.length > sg.max_positive)
    return res.status(400).json({ error: `Maximaal ${sg.max_positive} positieve keuzes.` });
  if (sg.allow_negative && negativeChoices.length > sg.max_negative)
    return res.status(400).json({ error: `Maximaal ${sg.max_negative} negatieve keuzes.` });

  // No self-selection
  const allIds = [...positiveChoices, ...negativeChoices];
  if (allIds.includes(studentId))
    return res.status(400).json({ error: 'Je kunt jezelf niet kiezen.' });

  // Verify all chosen IDs belong to this sociogram
  const validIds = new Set(
    dbAll('SELECT id FROM students WHERE sociogram_id = ?', [sg.id]).map(s => s.id)
  );
  if (allIds.some(id => !validIds.has(id)))
    return res.status(400).json({ error: 'Onbekende leerling gekozen.' });

  const token = req.params.token;

  dbTransaction(() => {
    const now = new Date().toISOString();
    positiveChoices.forEach(toId => {
      dbRun(
        'INSERT OR IGNORE INTO responses (sociogram_id, from_student, to_student, choice_type, submitted_at) VALUES (?,?,?,?,?)',
        [sg.id, studentId, toId, 'positive', now]
      );
    });
    if (sg.allow_negative) {
      negativeChoices.forEach(toId => {
        dbRun(
          'INSERT OR IGNORE INTO responses (sociogram_id, from_student, to_student, choice_type, submitted_at) VALUES (?,?,?,?,?)',
          [sg.id, studentId, toId, 'negative', now]
        );
      });
    }
    dbRun('INSERT OR IGNORE INTO submissions (sociogram_id, student_id, submitted_at) VALUES (?,?,?)',
      [sg.id, studentId, now]);
  });

  // Notify SSE listeners
  sseNotify(token);

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
  const submittedSet = new Set(submissions.map(s => Number(s.student_id)));
  const studentMap  = {};
  students.forEach(s => { studentMap[s.id] = s.name; });

  const posIn = {}, negIn = {};
  students.forEach(s => { posIn[s.id] = 0; negIn[s.id] = 0; });
  responses.forEach(r => {
    if (r.choice_type === 'positive') posIn[r.to_student] = (posIn[r.to_student] || 0) + 1;
    else negIn[r.to_student] = (negIn[r.to_student] || 0) + 1;
  });

  const N = students.length;
  let csv = 'Naam,Ingediend,Positieve keuzes,Negatieve keuzes,Nettoscore,Status\n';
  students.forEach(s => {
    const pos = posIn[s.id] || 0, neg = negIn[s.id] || 0, net = pos - neg;
    let status = 'Gemiddeld';
    if (pos === 0 && neg === 0 && submittedSet.size > 0) status = 'Geïsoleerd';
    else if (net >= Math.max(2, Math.floor(N * 0.25))) status = 'Ster';
    else if (neg >= Math.max(2, Math.floor(N * 0.25))) status = 'Afgewezen';
    else if (pos <= 1 && neg === 0) status = 'Verwaarloosd';
    csv += `"${csvEscape(s.name)}",${submittedSet.has(Number(s.id)) ? 'Ja' : 'Nee'},${pos},${neg},${net},"${status}"\n`;
  });

  csv += '\nKeuzes detail\nVan,Naar,Type\n';
  responses.forEach(r => {
    const from = studentMap[r.from_student] || r.from_student;
    const to   = studentMap[r.to_student]   || r.to_student;
    csv += `"${csvEscape(from)}","${csvEscape(to)}","${r.choice_type === 'positive' ? 'Positief' : 'Negatief'}"\n`;
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
