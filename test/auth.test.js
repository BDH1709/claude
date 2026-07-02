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

test('onbeveiligde pagina redirect naar login', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /\/login/);
});

test('login met verkeerd wachtwoord geeft 401 en geen sessie', async () => {
  maakTestgebruiker(db, { gebruikersnaam: 'meester', wachtwoord: 'correctpaardwachtwoord' });
  const agent = request.agent(app);

  const loginPagina = await agent.get('/login');
  const csrf = haalCsrfToken(loginPagina.text);

  const res = await agent
    .post('/login')
    .type('form')
    .send({ gebruikersnaam: 'meester', wachtwoord: 'verkeerd', _csrf: csrf });

  assert.equal(res.status, 401);

  const dashboard = await agent.get('/');
  assert.equal(dashboard.status, 302);
  assert.match(dashboard.headers.location, /\/login/);
});

test('login met correcte gegevens geeft toegang tot dashboard', async () => {
  const db2 = require('../src/db');
  db2.prepare('DELETE FROM gebruiker').run();
  maakTestgebruiker(db2, { gebruikersnaam: 'meester2', wachtwoord: 'anderwachtwoord123' });
  const agent = request.agent(app);

  const loginPagina = await agent.get('/login');
  const csrf = haalCsrfToken(loginPagina.text);

  const res = await agent
    .post('/login')
    .type('form')
    .send({ gebruikersnaam: 'meester2', wachtwoord: 'anderwachtwoord123', _csrf: csrf });

  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/');

  const dashboard = await agent.get('/');
  assert.equal(dashboard.status, 200);
  assert.match(dashboard.text, /Dashboard/);
});

test('POST zonder geldig csrf-token wordt geweigerd', async () => {
  const agent = request.agent(app);
  await agent.get('/login');
  const res = await agent.post('/login').type('form').send({ gebruikersnaam: 'x', wachtwoord: 'y', _csrf: 'ongeldig' });
  assert.equal(res.status, 403);
});
