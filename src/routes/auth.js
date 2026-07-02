const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.',
});

router.get('/login', (req, res) => {
  if (req.session.ingelogd) return res.redirect('/');
  res.render('login', { title: 'Inloggen', fout: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { gebruikersnaam, wachtwoord } = req.body;
  const gebruiker = db.prepare('SELECT * FROM gebruiker WHERE id = 1').get();

  const toonFout = () =>
    res.status(401).render('login', {
      title: 'Inloggen',
      fout: 'Gebruikersnaam of wachtwoord is onjuist.',
    });

  if (!gebruiker || !gebruikersnaam || !wachtwoord) {
    return toonFout();
  }

  const klopt = bcrypt.compareSync(wachtwoord, gebruiker.wachtwoord_hash);
  if (!klopt || gebruikersnaam !== gebruiker.gebruikersnaam) {
    return toonFout();
  }

  req.session.regenerate((err) => {
    if (err) return toonFout();
    req.session.ingelogd = true;
    req.session.gebruikersnaam = gebruiker.gebruikersnaam;
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('onderwijshub.sid');
    res.redirect('/login');
  });
});

module.exports = router;
