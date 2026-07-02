function vereistLogin(req, res, next) {
  if (req.session && req.session.ingelogd) {
    return next();
  }
  return res.redirect('/login');
}

module.exports = { vereistLogin };
