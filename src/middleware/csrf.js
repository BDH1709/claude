const crypto = require('node:crypto');

// Eenvoudige synchronizer-token CSRF-bescherming, zonder externe afhankelijkheid.
// Eén vast token per sessie, meegegeven aan alle views en gecontroleerd op elke
// state-changing request (POST/PUT/PATCH/DELETE).
function csrfMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  const wijzigendeMethodes = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (wijzigendeMethodes.includes(req.method)) {
    const verstuurdToken = req.body && req.body._csrf;
    if (!verstuurdToken || verstuurdToken !== req.session.csrfToken) {
      return res.status(403).render('error', {
        title: 'Ongeldig verzoek',
        message: 'Beveiligingstoken ontbreekt of is verlopen. Ververs de pagina en probeer het opnieuw.',
      });
    }
  }
  next();
}

module.exports = csrfMiddleware;
