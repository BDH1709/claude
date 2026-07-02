const test = require('node:test');
const assert = require('node:assert/strict');
const { initTestOmgeving, maakTestgebruiker } = require('../test-support/helpers');

initTestOmgeving();
const db = require('../src/db');
const app = require('../src/server');
const request = require('supertest');
const { vandaag, isoWeekdag } = require('../src/lib/datum');

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

test('weekrooster-item toevoegen vult de dagplanning van een schooldag', async () => {
  const agent = await ingelogdAgent();

  // Kies een datum die zeker een doordeweekse dag is (maandag).
  const vandaagWeekdag = isoWeekdag(vandaag());
  const dagenTotMaandag = vandaagWeekdag === 1 ? 7 : (8 - vandaagWeekdag) % 7 || 7;
  const { addDagen } = require('../src/lib/datum');
  const testMaandag = addDagen(vandaag(), vandaagWeekdag <= 5 ? 0 : dagenTotMaandag);
  const doelWeekdag = isoWeekdag(testMaandag);
  assert.ok(doelWeekdag >= 1 && doelWeekdag <= 5);

  const roosterPagina = await agent.get('/weekrooster');
  const csrf = haalCsrfToken(roosterPagina.text);

  await agent
    .post('/weekrooster/item')
    .type('form')
    .send({
      weekdag: String(doelWeekdag),
      starttijd: '09:00',
      eindtijd: '09:45',
      vak: 'pluspunt',
      lesdoel: 'Breuken optellen',
      notitie: '',
      _csrf: csrf,
    });

  const item = db.prepare('SELECT * FROM weekrooster_items WHERE weekdag = ?').get(doelWeekdag);
  assert.ok(item);
  assert.equal(item.vak, 'pluspunt');

  const dagPagina = await agent.get(`/dag/${testMaandag}`);
  assert.equal(dagPagina.status, 200);
  assert.match(dagPagina.text, /Breuken optellen/);

  const dagItem = db.prepare('SELECT * FROM dag_items WHERE datum = ?').get(testMaandag);
  assert.ok(dagItem);
  assert.equal(dagItem.sjabloon_item_id, item.id);
});

test('dagplanning-item toevoegen raakt alleen die dag, niet het sjabloon', async () => {
  const agent = await ingelogdAgent();
  const testDag = vandaag();
  await agent.get(`/dag/${testDag}`); // genereert (mogelijk lege) dagplanning

  const aantalSjabloonItemsVooraf = db.prepare('SELECT COUNT(*) AS n FROM weekrooster_items').get().n;

  const csrfPagina = await agent.get(`/dag/${testDag}`);
  const csrf = haalCsrfToken(csrfPagina.text);

  await agent.post(`/dag/${testDag}/item`).type('form').send({
    starttijd: '10:00',
    eindtijd: '10:30',
    vak: 'staal',
    lesdoel: 'Extra invoegd blok',
    notitie: '',
    _csrf: csrf,
  });

  const dagItem = db.prepare('SELECT * FROM dag_items WHERE datum = ? AND lesdoel = ?').get(testDag, 'Extra invoegd blok');
  assert.ok(dagItem);
  assert.equal(dagItem.sjabloon_item_id, null);

  const aantalSjabloonItemsErna = db.prepare('SELECT COUNT(*) AS n FROM weekrooster_items').get().n;
  assert.equal(aantalSjabloonItemsErna, aantalSjabloonItemsVooraf);
});

test('to-do toevoegen en afvinken', async () => {
  const agent = await ingelogdAgent();
  const todoPagina = await agent.get('/todos');
  const csrf = haalCsrfToken(todoPagina.text);

  await agent.post('/todos').type('form').send({ titel: 'Rapportgesprek inplannen', deadline: '', leerling_id: '', _csrf: csrf });

  const todo = db.prepare('SELECT * FROM todos WHERE titel = ?').get('Rapportgesprek inplannen');
  assert.ok(todo);
  assert.equal(todo.afgerond, 0);

  const lijst = await agent.get('/todos');
  const csrf2 = haalCsrfToken(lijst.text);

  await agent.post(`/todos/${todo.id}/afronden`).type('form').send({ _csrf: csrf2 });

  const bijgewerkt = db.prepare('SELECT * FROM todos WHERE id = ?').get(todo.id);
  assert.equal(bijgewerkt.afgerond, 1);
  assert.ok(bijgewerkt.afgerond_op);
});
