const test = require('node:test');
const assert = require('node:assert/strict');
const { initTestOmgeving, maakTestgebruiker } = require('../test-support/helpers');

initTestOmgeving();
const db = require('../src/db');
const app = require('../src/server');
const request = require('supertest');

function haalCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

async function ingelogdAgent() {
  maakTestgebruiker(db, { gebruikersnaam: 'meester', wachtwoord: 'testwachtwoord123' });
  const agent = request.agent(app);
  const loginPagina = await agent.get('/login');
  const csrf = haalCsrfToken(loginPagina.text);
  await agent.post('/login').type('form').send({ gebruikersnaam: 'meester', wachtwoord: 'testwachtwoord123', _csrf: csrf });
  return agent;
}

test('leerling toevoegen, tonen en archiveren', async () => {
  const agent = await ingelogdAgent();

  const nieuwPagina = await agent.get('/leerlingen/nieuw');
  const csrf = haalCsrfToken(nieuwPagina.text);

  const toevoegen = await agent
    .post('/leerlingen/nieuw')
    .type('form')
    .send({
      roepnaam: 'Lotte',
      groep: '7',
      niveau_rekenen: 'verrijking',
      niveau_taal: '',
      niveau_wereldorientatie: '',
      verjaardag_dag: '14',
      verjaardag_maand: '3',
      _csrf: csrf,
    });
  assert.equal(toevoegen.status, 302);

  const lijst = await agent.get('/leerlingen');
  assert.match(lijst.text, /Lotte/);

  const leerling = db.prepare('SELECT * FROM leerlingen WHERE roepnaam = ?').get('Lotte');
  assert.ok(leerling);
  assert.equal(leerling.niveau_rekenen, 'verrijking');
  assert.equal(leerling.verjaardag_dag, 14);
  assert.equal(leerling.gearchiveerd, 0);

  const detail = await agent.get(`/leerlingen/${leerling.id}`);
  assert.equal(detail.status, 200);
  const csrfDetail = haalCsrfToken(detail.text);

  const archiveren = await agent.post(`/leerlingen/${leerling.id}/archiveren`).type('form').send({ _csrf: csrfDetail });
  assert.equal(archiveren.status, 302);

  const na = db.prepare('SELECT gearchiveerd FROM leerlingen WHERE id = ?').get(leerling.id);
  assert.equal(na.gearchiveerd, 1);

  const actieveLijst = await agent.get('/leerlingen');
  assert.doesNotMatch(actieveLijst.text, /Lotte/);

  const gearchiveerdeLijst = await agent.get('/leerlingen?gearchiveerd=1');
  assert.match(gearchiveerdeLijst.text, /Lotte/);
});

test('leerling toevoegen zonder roepnaam geeft foutmelding', async () => {
  const agent = await ingelogdAgent();
  const nieuwPagina = await agent.get('/leerlingen/nieuw');
  const csrf = haalCsrfToken(nieuwPagina.text);

  const res = await agent.post('/leerlingen/nieuw').type('form').send({ roepnaam: '  ', _csrf: csrf });
  assert.equal(res.status, 400);
  assert.match(res.text, /verplicht/);
});

test('snelle notitie en aandachtspunt verschijnen op dashboard', async () => {
  const agent = await ingelogdAgent();
  const nieuwPagina = await agent.get('/leerlingen/nieuw');
  const csrf = haalCsrfToken(nieuwPagina.text);
  await agent.post('/leerlingen/nieuw').type('form').send({ roepnaam: 'Sem', _csrf: csrf });

  const leerling = db.prepare('SELECT * FROM leerlingen WHERE roepnaam = ?').get('Sem');
  const detail = await agent.get(`/leerlingen/${leerling.id}`);
  const csrfDetail = haalCsrfToken(detail.text);

  await agent
    .post(`/leerlingen/${leerling.id}/notities`)
    .type('form')
    .send({ tekst: 'Heeft extra uitleg nodig bij breuken', is_aandachtspunt: '1', _csrf: csrfDetail });

  const dashboard = await agent.get('/');
  assert.match(dashboard.text, /Sem/);
  assert.match(dashboard.text, /breuken/);
});
