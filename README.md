# Onderwijshub — groep 7, OBS Groenehoek

Persoonlijke cockpit voor klassenmanagement, planning en oudercommunicatie.
Voor één gebruiker (de leerkracht); geen leerling- of ouderaccounts.

Dit is **fase 1**: fundament (leerlingbeheer, authenticatie, database, Docker)
plus het dashboard (dagplanning vandaag, to-do's, aandachtspunten per
leerling, compact weekoverzicht).

## Stack

- Node.js + Express, server-side gerenderd met EJS (geen zwaar SPA-framework)
- SQLite via `better-sqlite3` (één databasebestand, geen aparte databaseserver)
- Sessies opgeslagen in dezelfde SQLite-database (geen Redis/extra service nodig)
- PWA-basis: manifest + service worker (zie "Bekende beperkingen")

## 1. Starten

### Met Docker Compose (aanbevolen, ook voor de Raspberry Pi)

```bash
cp .env.example .env
# Open .env en vul SESSION_SECRET in, bijvoorbeeld:
openssl rand -hex 32
# plak de uitvoer achter SESSION_SECRET= in .env

docker compose up -d --build
```

De app draait dan op `http://127.0.0.1:3000` **op de Pi zelf** (alleen
bereikbaar op localhost/het Docker-netwerk — zie hoofdstuk 3 voor veilige
ontsluiting naar buiten).

Maak daarna het (enige) account aan:

```bash
docker compose exec onderwijshub npm run create-admin
```

Dit vraagt om een gebruikersnaam en een wachtwoord van minimaal 12 tekens.
Let op: bij dit script wordt het wachtwoord zichtbaar getypt in de terminal
(geen sterretjes) — voer het dus niet uit op een gedeeld scherm.

### Zonder Docker (lokale ontwikkeling)

```bash
npm install
cp .env.example .env   # vul SESSION_SECRET in
npm run create-admin
npm run dev             # herstart automatisch bij codewijzigingen
```

De app draait dan op `http://localhost:3000`.

### Tests

```bash
npm test
```

Draait de geautomatiseerde tests (Node's ingebouwde testrunner + supertest)
tegen een tijdelijke, losse database. Alle tests zijn nu groen.

## 2. Wat moet je zelf configureren?

1. **Account**: `npm run create-admin` (zie boven). Er is precies één account;
   dit script overschrijft het bestaande account als je het opnieuw draait.
2. **Leerlingen invoeren**: log in, ga naar *Leerlingen → Nieuwe leerling*.
   Alleen roepnaam is verplicht; niveau-indicaties en verjaardag zijn optioneel.
3. **Weekrooster-sjabloon vullen**: ga naar *Weekrooster-sjabloon* en voeg per
   dag de vaste tijdblokken toe (vak, lesdoel, notitie). Dit sjabloon vult
   automatisch de dagplanning van elke nieuwe dag. **Vul dit sjabloon in
   vóórdat je voor het eerst een dag of week bekijkt** — een dag wordt maar
   één keer vanuit het sjabloon gegenereerd; wijzig je het sjabloon later, dan
   werkt dat alleen door op dagen die je nog niet eerder hebt bezocht. Al
   gegenereerde dagen pas je handmatig aan via de dagplanning zelf.
4. **Reverse proxy + HTTPS + VPN**: zie hoofdstuk 3, verplicht voordat je de
   app van buiten je eigen netwerk benadert.

## 3. Veilig extern bereikbaar maken

De app luistert standaard alleen op `127.0.0.1:3000` van de Pi (zie
`docker-compose.yml`). Er staan leerlinggegevens en persoonlijke notities in,
dus onbeveiligd naar internet openzetten is geen optie.

### Aanbevolen: VPN (WireGuard of Tailscale)

Zet geen poort open naar internet. Installeer WireGuard of Tailscale op de
Pi en op je laptop/telefoon, en benader de app via het VPN-adres van de Pi
(bijv. `http://100.x.x.x:3000` bij Tailscale, of via de reverse proxy
hieronder over VPN). Dit is de kleinste aanvalsoppervlakte: de app is dan
alleen bereikbaar als je apparaat op het VPN zit.

Zelfs binnen een VPN is een reverse proxy met HTTPS aan te raden zodra je
over openbare wifi verbindt (bijv. onderweg), omdat verkeer tussen jouw
apparaat en de VPN-eindpunt al versleuteld is, maar een lokaal self-signed
setup net zo goed via Caddy kan met een lokaal certificaat.

### Als je toch direct via internet wilt (bijv. geen VPN op je telefoon)

Zet **alleen** poort 443 (HTTPS) open op je router, nooit de Node-poort
(3000) direct. Gebruik een reverse proxy die automatisch een Let's
Encrypt-certificaat regelt:

**Optie A — Caddy** (makkelijkst, automatische HTTPS): zie
[`Caddyfile.example`](./Caddyfile.example). Kopieer naar `/etc/caddy/Caddyfile`,
pas het domein aan, herstart Caddy.

**Optie B — nginx + certbot**: zie [`nginx.example.conf`](./nginx.example.conf).
Vraag eerst een certificaat aan met `certbot --nginx`, kopieer dan deze config
en pas het domein aan.

In beide gevallen: zet daarna `COOKIE_SECURE=` niet op `false` (standaard aan
in productie), zodat sessiecookies alleen over HTTPS verstuurd worden.

### Overige ingebouwde beveiliging

- Verplicht inloggen; sessies verlopen na 8 uur.
- Rate limiting op `/login` (10 pogingen per 15 minuten per IP).
- Wachtwoorden gehasht met bcrypt, nooit in platte tekst opgeslagen.
- CSRF-bescherming op alle wijzigende requests.
- Beveiligingsheaders via Helmet (CSP, no-sniff, etc.).
- Geen leerlingnamen in URL's (alleen numerieke ID's).
- Database (`data/onderwijshub.db`) staat niet in de webroot en wordt nergens
  door de app zelf publiek geserveerd.

## 4. Backups

De app maakt **automatisch elke nacht om 03:00** een consistente backup van
de database naar `data/backups/` (bestandsnaam met tijdstempel). Backups
ouder dan 14 dagen worden automatisch opgeruimd (instelbaar via
`BACKUP_BEWAARDAGEN` in `.env`).

Handmatig een backup maken:

```bash
docker compose exec onderwijshub npm run backup
```

**Belangrijk**: `data/backups/` staat op dezelfde schijf als de Pi zelf. Dit
beschermt tegen een corrupte database of eigen fouten, maar niet tegen
Pi-uitval, diefstal of brand. Zorg zelf voor externe veiligstelling, bijv.:

```bash
# Voorbeeld: dagelijks via host-cron naar een andere machine/NAS syncen
rsync -av /pad/naar/onderwijshub/data/backups/ gebruiker@nas:/backups/onderwijshub/
```

Terugzetten: stop de container, kopieer een backupbestand terug naar
`data/onderwijshub.db`, start de container weer.

## 5. AVG / gegevensbescherming

- Er wordt alleen opgeslagen wat functioneel nodig is: roepnaam, groep,
  optionele niveau-indicatie per vak, dag+maand van de verjaardag (geen
  jaartal), en de notities die je zelf invoert.
- Geen BSN, geen foto's, geen achternamen verplicht.
- Alle data blijft lokaal op je eigen server; geen externe diensten,
  analytics of tracking.
- Documenten die je later (fase 5) uploadt, blijven ook lokaal — waarschuw
  jezelf bij het uploaden geen gevoelige leerlinggegevens in sjablonen te
  zetten (die functionaliteit komt in een latere fase).

## Bekende beperkingen (fase 1)

- **PWA-offline is nog niet volledig**: de service worker cachet alleen de
  statische app-shell (CSS/JS/iconen) zodat de app *installeerbaar* is op je
  telefoon. Offline inzage van de dagplanning en offline opslaan van snelle
  notities (met latere synchronisatie) zijn bewust nog niet gebouwd — dat
  vraagt een eigen data-cache- en sync-strategie die in een volgende fase
  wordt uitgewerkt.
- De weekrooster-sjabloon-generatie is "eenmalig per dag": zie de opmerking
  in hoofdstuk 2. Er is nog geen knop om een al-gegenereerde dag opnieuw
  vanuit het sjabloon te vullen (overschrijft dan bewust je afwijkingen niet).
- Leerlingnotities zijn in deze fase minimaal (los tekstveld +
  aandachtspunt-vlag). De volledige module met categorieën, vervolgacties,
  tijdlijn en export volgt in fase 3.
- App-iconen zijn eenvoudige placeholders (teal vierkant); vervang
  `public/icons/icon-192.png` en `icon-512.png` naar wens door je eigen
  huisstijl-iconen (zelfde bestandsnamen/afmetingen aanhouden).
- `npm run create-admin` toont het wachtwoord in leesbare tekst tijdens het
  typen (geen sterretjes) — voer dit dus niet uit met iemand meekijkend.
- Geen automatische database-migraties met versiebeheer; het schema wordt bij
  opstarten idempotent toegepast (`CREATE TABLE IF NOT EXISTS`). Voor fase 1
  is dat voldoende; bij grotere schemawijzigingen in latere fases voegen we
  een echt migratiesysteem toe.

## Volgende stappen

Zodra je akkoord geeft, gaat fase 2 verder met klassenmanagement en
digibordschermen: klassentaken-rouleren, beurtenpicker, digibord-dagritme en
de timer/stoplicht voor zelfstandig werken.

## Projectstructuur

```
src/
  server.js            Express-app, middleware, routes koppelen
  db/                   SQLite-schema, connectie, sessie-store
  lib/                  Datumhelpers, vakken/niveaus, dagplanning-logica, backups
  middleware/           Authenticatie, CSRF
  routes/                auth, dashboard, students, schedule, todos
  views/                 EJS-templates
public/                  CSS, client-JS, manifest, service worker, iconen
scripts/                 create-admin, handmatige backup
test/                    Geautomatiseerde tests (node:test + supertest)
data/                    SQLite-database, backups, uploads (niet in git)
```
