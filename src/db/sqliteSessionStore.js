const session = require('express-session');
const db = require('./index');

// Lichtgewicht sessie-store bovenop dezelfde SQLite-database, zodat er geen
// extra afhankelijkheid (met eigen native module) nodig is naast better-sqlite3.
class SqliteSessionStore extends session.Store {
  constructor() {
    super();
    this.getStmt = db.prepare('SELECT data, verloopt_op FROM sessies WHERE sid = ?');
    this.setStmt = db.prepare(
      'INSERT INTO sessies (sid, data, verloopt_op) VALUES (@sid, @data, @verloopt_op) ' +
      'ON CONFLICT(sid) DO UPDATE SET data = @data, verloopt_op = @verloopt_op'
    );
    this.destroyStmt = db.prepare('DELETE FROM sessies WHERE sid = ?');
    this.cleanupStmt = db.prepare('DELETE FROM sessies WHERE verloopt_op < ?');
    this.touchStmt = db.prepare('UPDATE sessies SET verloopt_op = ? WHERE sid = ?');

    // Ruim periodiek verlopen sessies op.
    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanupStmt.run(Date.now());
      } catch (err) {
        // stille no-op: opruimen mag nooit de app laten crashen
      }
    }, 15 * 60 * 1000);
    this.cleanupInterval.unref();
  }

  get(sid, cb) {
    try {
      const row = this.getStmt.get(sid);
      if (!row) return cb(null, null);
      if (row.verloopt_op < Date.now()) {
        this.destroyStmt.run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sessionData, cb) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge
        ? sessionData.cookie.maxAge
        : 24 * 60 * 60 * 1000;
      const verlooptOp = Date.now() + maxAge;
      this.setStmt.run({ sid, data: JSON.stringify(sessionData), verloopt_op: verlooptOp });
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.destroyStmt.run(sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  touch(sid, sessionData, cb) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge
        ? sessionData.cookie.maxAge
        : 24 * 60 * 60 * 1000;
      this.touchStmt.run(Date.now() + maxAge, sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }
}

module.exports = SqliteSessionStore;
