# Vacaturetool basisonderwijs — persoonlijke tool van Bas

Een persoonlijke, self-hostbare webapp om vacatures in het basisonderwijs te verzamelen,
filteren, beoordelen en vergelijken, met een uitlegbare matchscore op basis van Bas'
voorkeuren (groep 5/6/7, regio Zoetermeer, vaste/fulltime baan, begeleiding,
parallelgroepen, onderzoekend leren, STEAM).

De frontend is volledig statisch (HTML/CSS/vanilla JavaScript) en leest lokale
JSON-data. Een los Node.js-importscript kan die JSON-data later vullen vanuit
echte vacaturefeeds (RSS/XML, JSON-API of CSV), zonder dat de frontend hoeft te
veranderen.

## Bestandsstructuur

```
index.html                 # de hele app (één pagina, met view-switching)
css/style.css               # styling
js/app.js                   # rendering, filters, modal, state
js/matchscore.js             # matchscore-berekening + uitleg
js/storage.js                # localStorage voor notities/reflecties/vergelijklijst
data/vacatures.json           # huidige vacaturedata (door de app gelezen)
data/profiel.json             # Bas' voorkeuren + scoregewichten
scripts/import-feeds.js        # orchestreert het ophalen van feeds
scripts/feeds.config.json      # welke bronnen zijn actief, en hun instellingen
scripts/normaliseer.js         # zet ruwe brondata om naar het uniforme model
scripts/adapters/              # één adapter per brontype (rss, json, csv)
nginx/app.conf                 # nginx-config voor directe installatie op de Pi
nginx/docker.conf              # nginx-config voor gebruik binnen Docker
Dockerfile / docker-compose.yml # optionele Docker-opzet
```

## 1. Lokaal testen (op je eigen computer)

Omdat de app via `fetch()` JSON-bestanden laadt, moet je een lokale webserver
gebruiken (rechtstreeks een `.html`-bestand openen werkt niet door
browserbeveiliging). Kies één van deze opties:

```bash
# Optie A: Python (meestal al aanwezig)
python3 -m http.server 8000

# Optie B: Node.js
npx serve -l 8000
```

Open daarna `http://localhost:8000` in de browser.

## 2. Bestanden naar de Raspberry Pi kopiëren

Vanaf je eigen computer, vanuit de map met dit project:

```bash
rsync -avz --exclude node_modules --exclude .git ./ pi@<ip-van-je-pi>:/home/pi/bas-vacaturetool/
```

(Vervang `<ip-van-je-pi>` door het IP-adres van je Raspberry Pi. `scp -r` werkt ook.)

## 3. Serveren via nginx op de Raspberry Pi

Log in op de Pi via SSH en installeer nginx als dat nog niet is gebeurd:

```bash
sudo apt update && sudo apt install -y nginx
```

Maak de webroot aan en kopieer de juiste bestanden erin:

```bash
sudo mkdir -p /var/www/bas-vacaturetool
sudo cp -r /home/pi/bas-vacaturetool/index.html \
           /home/pi/bas-vacaturetool/css \
           /home/pi/bas-vacaturetool/js \
           /home/pi/bas-vacaturetool/data \
           /var/www/bas-vacaturetool/
```

Rechten zetten (nginx draait als gebruiker `www-data`):

```bash
sudo chown -R www-data:www-data /var/www/bas-vacaturetool
sudo find /var/www/bas-vacaturetool -type d -exec chmod 755 {} \;
sudo find /var/www/bas-vacaturetool -type f -exec chmod 644 {} \;
```

Koppel de nginx-configuratie:

```bash
sudo cp /home/pi/bas-vacaturetool/nginx/app.conf /etc/nginx/sites-available/bas-vacaturetool
sudo ln -s /etc/nginx/sites-available/bas-vacaturetool /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # voorkomt conflict met de standaardsite
```

Configuratie controleren en nginx herladen:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

De app is nu bereikbaar via `http://<ip-van-je-pi>/`.

## 4. Vacatures bijwerken

### Handmatig

Pas `data/vacatures.json` aan (lokaal of direct op de Pi met bv. `nano`) volgens
het uniforme vacaturemodel (zie hieronder), en kopieer het bestand naar
`/var/www/bas-vacaturetool/data/vacatures.json`. Een pagina-refresh in de browser
is genoeg; nginx hoeft niet herladen te worden voor databestanden.

### Via het importscript

```bash
cd /home/pi/bas-vacaturetool
node scripts/import-feeds.js --dry-run   # toont wat er zou gebeuren, schrijft niets
node scripts/import-feeds.js             # haalt ingeschakelde bronnen op en schrijft data/vacatures.json
cp data/vacatures.json /var/www/bas-vacaturetool/data/vacatures.json
```

Bronnen zet je aan/uit en configureer je in `scripts/feeds.config.json` (zie
hoofdstuk "Nieuwe bronnen toevoegen" hieronder). Zolang er geen bronnen
ingeschakeld zijn, doet het script niets en blijft je data ongewijzigd — veilig
om sowieso periodiek te laten draaien.

## 5. Periodieke feedimport (cron of systemd timer)

**Optie A — cron** (eenvoudigst):

```bash
crontab -e
```

Voeg een regel toe die elke ochtend om 06:00 de import draait en het resultaat
naar de webroot kopieert:

```
0 6 * * * cd /home/pi/bas-vacaturetool && /usr/bin/node scripts/import-feeds.js >> /home/pi/bas-vacaturetool/import.log 2>&1 && cp data/vacatures.json /var/www/bas-vacaturetool/data/vacatures.json
```

**Optie B — systemd timer** (overzichtelijker te beheren via `systemctl`):

`/etc/systemd/system/vacatures-import.service`:

```ini
[Unit]
Description=Importeer vacaturefeeds voor bas-vacaturetool

[Service]
Type=oneshot
WorkingDirectory=/home/pi/bas-vacaturetool
ExecStart=/usr/bin/node scripts/import-feeds.js
ExecStartPost=/bin/cp /home/pi/bas-vacaturetool/data/vacatures.json /var/www/bas-vacaturetool/data/vacatures.json
```

`/etc/systemd/system/vacatures-import.timer`:

```ini
[Unit]
Description=Draai vacatures-import elke ochtend

[Timer]
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Activeren:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vacatures-import.timer
sudo systemctl list-timers | grep vacatures   # controleren
```

## 6. Optioneel: draaien via Docker

Als je liever geen nginx rechtstreeks op de Pi installeert:

```bash
cd /home/pi/bas-vacaturetool
docker compose up -d --build
```

De app is dan bereikbaar via `http://<ip-van-je-pi>:8080/`. De map `data/` wordt
als read-only volume gemount, zodat `node scripts/import-feeds.js` (buiten de
container, via cron/systemd zoals hierboven) nieuwe data kan wegschrijven zonder
dat je de container opnieuw moet bouwen.

## Het uniforme vacaturemodel

Elke vacature in `data/vacatures.json` volgt dit model (zie ook
`scripts/normaliseer.js`):

| Veld | Betekenis |
|---|---|
| `id`, `bron`, `url` | identificatie en herkomst |
| `schoolnaam`, `plaats`, `regio` | locatiegegevens |
| `functietitel`, `groepen`, `fte`, `contracttype` | functiegegevens |
| `vast_of_tijdelijk` | aanstellingsvorm |
| `schoolgrootte`, `aantal_leerlingen`, `parallelgroepen` | schoolprofiel |
| `onderwijsvisie`, `begeleiding` | inhoudelijke tekst, gebruikt in de matchscore |
| `ov_bereikbaarheid` (`score` 1-5, `toelichting`), `reistijd_minuten` | bereikbaarheid |
| `innovatie_score`, `steam_score` (1-5) | indicatie van innovatie/STEAM |
| `vacaturetekst`, `datum_gepubliceerd` | volledige tekst en publicatiedatum |
| `notities`, `reflectie` | door Bas lokaal toegevoegd, blijft behouden bij een nieuwe import |

`data/profiel.json` bevat Bas' voorkeuren én de gewichten die de matchscore
gebruikt (`js/matchscore.js`). Voorkeuren wijzigen kan zonder code aan te
passen: pas gewoon de waarden in dit bestand aan.

## Architectuur vacaturefeeds

De app is bewust in vier lagen opgebouwd, zodat hij niet vastzit aan één
specifiek vacatureplatform:

1. **Bronlaag** (`scripts/adapters/rss-adapter.js`, `json-adapter.js`,
   `csv-adapter.js`) — elke adapter haalt data op uit één brontype en geeft
   die door aan de normalisatielaag. Een XML/RSS-feed van een vacaturebank is
   hier één mogelijke invoerbron, maar zeker niet de enige — er kan evengoed
   een JSON-API of een handmatige CSV-export gekoppeld worden.
2. **Normalisatielaag** (`scripts/normaliseer.js`) — zet alle brongegevens om
   naar het uniforme vacaturemodel hierboven, met veilige standaardwaarden voor
   ontbrekende velden.
3. **Opslaglaag** (`scripts/import-feeds.js`) — schrijft atomisch naar
   `data/vacatures.json` (via een tijdelijk bestand + rename, zodat de app
   nooit een half geschreven bestand leest), maakt een backup
   (`data/vacatures.backup.json`) en behoudt bestaande notities/reflecties van
   Bas voor vacatures die ook in de nieuwe import voorkomen.
4. **Presentatielaag** (de frontend) — leest uitsluitend `data/vacatures.json`
   en weet niets van de oorspronkelijke bron. Hierdoor kan een bron wisselen of
   wegvallen zonder dat de frontend ooit aangepast moet worden.

**Foutafhandeling:** als een bron niet bereikbaar is (timeout, foute status,
parsefout), logt het script dat, slaat die bron over en gaat door met de
overige bronnen. Als geen enkele bron data oplevert, blijft het bestaande
`data/vacatures.json` ongewijzigd staan — er wordt nooit overschreven met een
leeg resultaat.

## Nieuwe bronnen en vacatures toevoegen

**Een nieuwe feed koppelen:** voeg een object toe aan `bronnen` in
`scripts/feeds.config.json` met een `id`, `type` (`rss`, `json` of `csv`), de
juiste `url`/`pad`, en `"ingeschakeld": true`. Voor een JSON-API met afwijkende
veldnamen kun je een `veldmapping` meegeven (zie het voorbeeld in dat bestand)
zodat `scripts/normaliseer.js` de juiste velden naar het uniforme model
vertaalt — zonder dat er code gewijzigd moet worden.

**Een nieuw brontype toevoegen** (bv. een ander XML-formaat): maak een nieuw
bestand in `scripts/adapters/` met een `haalOp(bronConfig)`-functie die een
array van objecten teruggeeft via `maakUniformeVacature(...)`, en registreer
het in de `ADAPTERS`-map in `scripts/import-feeds.js`.

**Een vacature handmatig toevoegen:** voeg een object toe aan
`data/vacatures.json` volgens het uniforme model, of gebruik de CSV-fallback
(`scripts/adapters/csv-adapter.js`) met een kopregel die de veldnamen van het
model gebruikt.
