-- Onderwijshub database schema
-- Eén gebruiker (de leerkracht) - geen multi-user functionaliteit.

CREATE TABLE IF NOT EXISTS gebruiker (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- er is precies één gebruiker
  gebruikersnaam TEXT NOT NULL,
  wachtwoord_hash TEXT NOT NULL,
  aangemaakt_op TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessies (
  sid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  verloopt_op INTEGER NOT NULL
);

-- Leerlingen: alleen functioneel noodzakelijke gegevens (AVG).
-- Geen BSN, geen foto's, geen achternaam vereist.
CREATE TABLE IF NOT EXISTS leerlingen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roepnaam TEXT NOT NULL,
  groep TEXT NOT NULL DEFAULT '7',
  niveau_rekenen TEXT CHECK (niveau_rekenen IN ('basis','verlengde_instructie','verrijking')),
  niveau_taal TEXT CHECK (niveau_taal IN ('basis','verlengde_instructie','verrijking')),
  niveau_wereldorientatie TEXT CHECK (niveau_wereldorientatie IN ('basis','verlengde_instructie','verrijking')),
  verjaardag_dag INTEGER CHECK (verjaardag_dag BETWEEN 1 AND 31),
  verjaardag_maand INTEGER CHECK (verjaardag_maand BETWEEN 1 AND 12),
  gearchiveerd INTEGER NOT NULL DEFAULT 0,
  aangemaakt_op TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leerlingen_gearchiveerd ON leerlingen(gearchiveerd);

-- Fundament voor leerlingnotities (volledig uitgewerkt in latere fase).
-- Nu alleen: snelle tekstnotitie + aandachtspunt-markering voor het dashboard.
CREATE TABLE IF NOT EXISTS notities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leerling_id INTEGER NOT NULL REFERENCES leerlingen(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  categorie TEXT, -- gereserveerd voor fase 3 (gedrag/didactiek/oudercontact/overig)
  is_aandachtspunt INTEGER NOT NULL DEFAULT 0,
  gedeeld_met_invaller INTEGER NOT NULL DEFAULT 0, -- gereserveerd voor fase 5
  datum TEXT NOT NULL DEFAULT (date('now')),
  aangemaakt_op TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notities_leerling ON notities(leerling_id);
CREATE INDEX IF NOT EXISTS idx_notities_aandachtspunt ON notities(is_aandachtspunt);

-- Weekrooster-sjabloon: het terugkerende patroon per weekdag (1=ma .. 5=vr).
CREATE TABLE IF NOT EXISTS weekrooster_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekdag INTEGER NOT NULL CHECK (weekdag BETWEEN 1 AND 5),
  starttijd TEXT NOT NULL, -- 'HH:MM'
  eindtijd TEXT NOT NULL,
  vak TEXT NOT NULL CHECK (vak IN ('pluspunt','staal','blink','overig')),
  lesdoel TEXT,
  notitie TEXT,
  volgorde INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_weekrooster_weekdag ON weekrooster_items(weekdag);

-- Dagplanning: concrete datum, standaard gegenereerd vanuit het weekrooster-sjabloon.
-- Alleen afwijkingen worden hier aangepast; oorspronkelijke sjabloon blijft ongewijzigd.
CREATE TABLE IF NOT EXISTS dag_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datum TEXT NOT NULL, -- 'YYYY-MM-DD'
  starttijd TEXT NOT NULL,
  eindtijd TEXT NOT NULL,
  vak TEXT NOT NULL CHECK (vak IN ('pluspunt','staal','blink','overig')),
  lesdoel TEXT,
  notitie TEXT,
  volgorde INTEGER NOT NULL DEFAULT 0,
  sjabloon_item_id INTEGER REFERENCES weekrooster_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dag_items_datum ON dag_items(datum);

-- Houdt bij voor welke datums de dagplanning al vanuit het sjabloon is gegenereerd,
-- zodat een dag zonder items (bewust leeggemaakt) niet steeds opnieuw wordt gevuld.
CREATE TABLE IF NOT EXISTS dag_gegenereerd (
  datum TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titel TEXT NOT NULL,
  omschrijving TEXT,
  deadline TEXT, -- 'YYYY-MM-DD', optioneel
  leerling_id INTEGER REFERENCES leerlingen(id) ON DELETE SET NULL,
  afgerond INTEGER NOT NULL DEFAULT 0,
  aangemaakt_op TEXT NOT NULL DEFAULT (datetime('now')),
  afgerond_op TEXT
);

CREATE INDEX IF NOT EXISTS idx_todos_afgerond ON todos(afgerond);
CREATE INDEX IF NOT EXISTS idx_todos_deadline ON todos(deadline);
