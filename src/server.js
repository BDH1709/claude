require('dotenv').config();

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const db = require('./db');
const SqliteSessionStore = require('./db/sqliteSessionStore');
const csrfMiddleware = require('./middleware/csrf');
const { vereistLogin } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const studentRoutes = require('./routes/students');
const scheduleRoutes = require('./routes/schedule');
const todoRoutes = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 16) {
  console.error(
    'FOUT: SESSION_SECRET ontbreekt of is te kort. Zet een lange, willekeurige waarde in .env (zie .env.example).'
  );
  process.exit(1);
}

// De app draait achter een reverse proxy (Caddy/nginx) die HTTPS afhandelt.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    store: new SqliteSessionStore(),
    name: 'onderwijshub.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
      maxAge: 8 * 60 * 60 * 1000, // 8 uur, ruim genoeg voor een lesdag
    },
  })
);

app.use(csrfMiddleware);

// Beschikbaar in alle views.
app.use((req, res, next) => {
  res.locals.ingelogd = !!(req.session && req.session.ingelogd);
  res.locals.huidigPad = req.path;
  next();
});

app.use('/', authRoutes);

// Alles hierna vereist een ingelogde sessie.
app.use(vereistLogin);

app.use('/', dashboardRoutes);
app.use('/', studentRoutes);
app.use('/', scheduleRoutes);
app.use('/', todoRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Niet gevonden', message: 'Deze pagina bestaat niet.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Er ging iets mis', message: 'Er is een onverwachte fout opgetreden.' });
});

if (require.main === module) {
  const { planDagelijkseBackup } = require('./lib/backup');
  planDagelijkseBackup();

  app.listen(PORT, () => {
    console.log(`Onderwijshub draait op http://localhost:${PORT}`);
  });
}

module.exports = app;
