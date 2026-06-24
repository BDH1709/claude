/**
 * Applicatielogica: laadt data, berekent matchscores en rendert alle
 * onderdelen van de single-page app (overzicht, vergelijken, sollicitatiehulp,
 * detailmodal met reflectie en checklist).
 */

const CHECKLIST_ITEMS = [
  { key: "begeleiding_gevraagd", label: "Gevraagd hoe het begeleidingstraject er concreet uitziet" },
  { key: "klas_bezocht", label: "Een klas bezocht of meegelopen tijdens een lesdag" },
  { key: "team_ontmoet", label: "Het team ontmoet, ook buiten het formele gesprek" },
  { key: "visie_document", label: "Schoolplan of onderwijsvisie ingezien" },
  { key: "reistijd_getest", label: "De reistijd met OV in de praktijk getest" },
  { key: "parallel_gevraagd", label: "Gevraagd naar samenwerking binnen de jaargroep / parallelgroepen" },
  { key: "groei_gevraagd", label: "Gevraagd naar ruimte voor onderzoekend leren en STEAM-initiatieven" },
];

const REFLECTIE_STELLINGEN = [
  { key: "team_warm", label: "Het team voelde warm en open aan" },
  { key: "begeleiding_sterk", label: "De begeleiding kwam sterk over" },
  { key: "organisatie_duidelijk", label: "De organisatie was duidelijk" },
  { key: "rust_structuur", label: "Er was rust en structuur op school" },
  { key: "ruimte_innovatie", label: "Er leek ruimte voor innovatie" },
  { key: "visie_past", label: "De schoolvisie past bij mij" },
  { key: "plezier_werken", label: "Ik zou hier met plezier gaan werken" },
];

const SOLLICITATIEHULP_GROEPEN = [
  { thema: "Begeleiding & inwerken", vragen: [
    "Hoe worden nieuwe leerkrachten begeleid in het eerste jaar?",
    "Is er een vaste mentor of buddy, en hoe vaak is er contact?",
    "Hoe wordt feedback gegeven op mijn lessen?",
  ]},
  { thema: "Parallelgroepen & samenwerking", vragen: [
    "Hoe is de samenwerking binnen parallelgroepen georganiseerd?",
    "Wordt er gezamenlijk lesstof en materiaal voorbereid?",
    "Hoe wordt afgestemd tussen leerkrachten van dezelfde jaargroep?",
  ]},
  { thema: "Onderzoekend leren", vragen: [
    "Hoe krijgt onderzoekend leren vorm in de school?",
    "Welke ruimte krijgen leerlingen om eigen onderzoeksvragen te stellen?",
    "Hoe wordt onderzoekend leren beoordeeld of geëvalueerd?",
  ]},
  { thema: "STEAM & innovatie", vragen: [
    "Is er ruimte voor STEAM of technisch onderwijs?",
    "Zijn er specifieke voorzieningen zoals een technieklokaal of makerspace?",
    "Hoe gaat de school om met nieuwe lesideeën van leerkrachten?",
  ]},
  { thema: "Autonomie & taakverdeling", vragen: [
    "Hoeveel autonomie hebben leerkrachten in de inrichting van hun lessen?",
    "Hoe ziet de taakverdeling binnen het team eruit?",
    "Hoe wordt ondersteuning (RT, onderwijsassistentie) georganiseerd?",
  ]},
  { thema: "Ouders & omgeving", vragen: [
    "Hoe wordt samengewerkt met ouders?",
    "Hoe is de communicatie tussen school en ouders ingericht?",
  ]},
];

const state = {
  profiel: null,
  vacatures: [],
  vergelijklijst: [],
};

async function init() {
  const [profielResp, vacaturesResp] = await Promise.all([
    fetch("data/profiel.json"),
    fetch("data/vacatures.json"),
  ]);
  state.profiel = await profielResp.json();
  const ruweVacatures = await vacaturesResp.json();
  state.vacatures = ruweVacatures.map((v) => ({ ...v, match: berekenMatchscore(v, state.profiel) }));
  state.vergelijklijst = Storage.getVergelijklijst();

  renderToplijst();
  renderGrid();
  renderVergelijkenTabel();
  renderSollicitatiehulp();
  bindGlobaleEvents();
  bindFilterEvents();
}

function scoreKleurklasse(score) {
  if (score >= 75) return "score--goed";
  if (score >= 50) return "score--matig";
  return "score--zwak";
}

function scoreBadge(score) {
  return `<div class="score-badge ${scoreKleurklasse(score)}">
    <span class="score-badge__getal">${score}</span>
    <span class="score-badge__label">match</span>
  </div>`;
}

function vindVacature(id) {
  return state.vacatures.find((v) => v.id === id);
}

/* ---------- TOPLIJST ---------- */

function renderToplijst() {
  const top = [...state.vacatures].sort((a, b) => b.match.totaal - a.match.totaal).slice(0, 5);
  const grid = document.getElementById("toplijst-grid");
  grid.innerHTML = top.map((v, i) => `
    <article class="topkaart" data-id="${v.id}">
      <span class="topkaart__rang">#${i + 1}</span>
      ${scoreBadge(v.match.totaal)}
      <h3>${v.schoolnaam}</h3>
      <p class="topkaart__meta">${v.plaats} · groep ${v.groepen.join("/")}</p>
      <button class="knop knop--klein" data-actie="detail" data-id="${v.id}">Bekijk details</button>
    </article>
  `).join("");
  grid.querySelectorAll("[data-actie='detail']").forEach((btn) => {
    btn.addEventListener("click", () => openDetailModal(btn.dataset.id));
  });
}

/* ---------- FILTERS & OVERZICHT ---------- */

function huidigeFilters() {
  return {
    groep: document.getElementById("filter-groep").value,
    reistijd: document.getElementById("filter-reistijd").value,
    ov: document.getElementById("filter-ov").value,
    dienstverband: document.getElementById("filter-dienstverband").value,
    contract: document.getElementById("filter-contract").value,
    grootte: document.getElementById("filter-grootte").value,
    begeleiding: document.getElementById("filter-begeleiding").checked,
    onderzoekend: document.getElementById("filter-onderzoekend").checked,
    steam: document.getElementById("filter-steam").checked,
    parallel: document.getElementById("filter-parallel").checked,
    score: Number(document.getElementById("filter-score").value),
  };
}

function voldoetAanFilters(v, f) {
  if (f.groep && !v.groepen.includes(Number(f.groep))) return false;
  if (f.reistijd && v.reistijd_minuten > Number(f.reistijd)) return false;
  if (f.ov && (v.ov_bereikbaarheid?.score ?? 0) < Number(f.ov)) return false;
  if (f.dienstverband === "fulltime" && v.fte < 1.0) return false;
  if (f.dienstverband === "parttime" && v.fte >= 1.0) return false;
  if (f.contract === "vast" && !/vast/i.test(v.vast_of_tijdelijk) ) return false;
  if (f.contract === "tijdelijk" && !/tijdelijk/i.test(v.vast_of_tijdelijk)) return false;
  if (f.grootte && v.schoolgrootte !== f.grootte) return false;
  if (f.begeleiding && v.match.deelscores.find((d) => d.key === "begeleiding").punten / v.match.deelscores.find((d) => d.key === "begeleiding").max < 0.6) return false;
  if (f.onderzoekend && v.match.deelscores.find((d) => d.key === "onderzoekend_leren").punten / v.match.deelscores.find((d) => d.key === "onderzoekend_leren").max < 0.6) return false;
  if (f.steam && (v.steam_score ?? 0) < 4) return false;
  if (f.parallel && !v.parallelgroepen) return false;
  if (v.match.totaal < f.score) return false;
  return true;
}

function renderGrid() {
  const f = huidigeFilters();
  const gefilterd = state.vacatures.filter((v) => voldoetAanFilters(v, f));
  const grid = document.getElementById("vacatures-grid");
  const geenResultaten = document.getElementById("geen-resultaten");
  document.getElementById("resultaten-aantal").textContent = `${gefilterd.length} van ${state.vacatures.length} vacatures`;

  if (gefilterd.length === 0) {
    grid.innerHTML = "";
    geenResultaten.classList.remove("geen-resultaten--verborgen");
    return;
  }
  geenResultaten.classList.add("geen-resultaten--verborgen");

  grid.innerHTML = gefilterd
    .sort((a, b) => b.match.totaal - a.match.totaal)
    .map((v) => maakVacatureKaart(v))
    .join("");

  grid.querySelectorAll("[data-actie='detail']").forEach((btn) => btn.addEventListener("click", () => openDetailModal(btn.dataset.id)));
  grid.querySelectorAll("[data-actie='vergelijk']").forEach((btn) => btn.addEventListener("click", () => toggleVergelijk(btn.dataset.id)));
  grid.querySelectorAll("[data-actie='notitie']").forEach((btn) => btn.addEventListener("click", () => openDetailModal(btn.dataset.id, { focusNotitie: true })));
}

function maakVacatureKaart(v) {
  const inVergelijklijst = state.vergelijklijst.includes(v.id);
  return `
  <article class="vacature-kaart">
    <div class="vacature-kaart__kop">
      <div>
        <h3>${v.schoolnaam}</h3>
        <p class="vacature-kaart__meta">${v.plaats} · ${v.functietitel}</p>
      </div>
      ${scoreBadge(v.match.totaal)}
    </div>
    <ul class="vacature-kaart__feiten">
      <li>👥 Groep ${v.groepen.join("/")}</li>
      <li>⏱ ${v.fte} fte · ${v.vast_of_tijdelijk}</li>
      <li>🏫 ${v.schoolgrootte} (${v.aantal_leerlingen} lln) ${v.parallelgroepen ? "· parallelgroepen" : ""}</li>
      <li>🔬 onderzoekend leren ${v.match.deelscores.find(d=>d.key==="onderzoekend_leren").punten / v.match.deelscores.find(d=>d.key==="onderzoekend_leren").max >= 0.6 ? "✔" : "—"} · STEAM ${v.steam_score}/5</li>
      <li>🚆 OV ${v.ov_bereikbaarheid.score}/5 · ${v.reistijd_minuten} min</li>
      <li>🧭 ${v.begeleiding}</li>
    </ul>
    <div class="vacature-kaart__acties">
      <button class="knop knop--primair knop--klein" data-actie="detail" data-id="${v.id}">Details</button>
      <button class="knop knop--subtiel knop--klein ${inVergelijklijst ? "knop--actief" : ""}" data-actie="vergelijk" data-id="${v.id}">${inVergelijklijst ? "✓ Vergelijken" : "+ Vergelijken"}</button>
      <button class="knop knop--subtiel knop--klein" data-actie="notitie" data-id="${v.id}">Notitie</button>
    </div>
  </article>`;
}

function bindFilterEvents() {
  const ids = ["filter-groep", "filter-reistijd", "filter-ov", "filter-dienstverband", "filter-contract", "filter-grootte", "filter-begeleiding", "filter-onderzoekend", "filter-steam", "filter-parallel"];
  ids.forEach((id) => document.getElementById(id).addEventListener("change", renderGrid));

  const scoreSlider = document.getElementById("filter-score");
  scoreSlider.addEventListener("input", () => {
    document.getElementById("filter-score-waarde").textContent = scoreSlider.value;
    renderGrid();
  });

  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") el.checked = false; else el.value = "";
    });
    scoreSlider.value = 0;
    document.getElementById("filter-score-waarde").textContent = "0";
    renderGrid();
  });
}

/* ---------- VERGELIJKEN ---------- */

function toggleVergelijk(id) {
  const resultaat = Storage.toggleVergelijk(id);
  if (resultaat.vol) {
    alert("Je kunt maximaal 4 vacatures tegelijk vergelijken. Verwijder er eerst één.");
    return;
  }
  state.vergelijklijst = resultaat.lijst;
  renderGrid();
  renderVergelijkenTabel();
  bijwerkenVergelijkTeller();
}

function bijwerkenVergelijkTeller() {
  document.getElementById("vergelijk-teller").textContent = state.vergelijklijst.length;
}

const VERGELIJK_RIJEN = [
  { label: "Matchscore", render: (v) => `${v.match.totaal}/100` },
  { label: "School", render: (v) => v.schoolnaam },
  { label: "Plaats", render: (v) => v.plaats },
  { label: "Groep", render: (v) => v.groepen.join("/") },
  { label: "Fte", render: (v) => v.fte },
  { label: "Contracttype", render: (v) => v.contracttype },
  { label: "Vast / tijdelijk", render: (v) => v.vast_of_tijdelijk },
  { label: "Begeleiding", render: (v) => v.begeleiding },
  { label: "Schoolgrootte", render: (v) => `${v.schoolgrootte} (${v.aantal_leerlingen} lln)` },
  { label: "Parallelgroepen", render: (v) => (v.parallelgroepen ? "Ja" : "Nee") },
  { label: "Onderzoekend leren", render: (v) => v.onderwijsvisie },
  { label: "STEAM / innovatie", render: (v) => `${v.steam_score}/5` },
  { label: "OV-bereikbaarheid", render: (v) => `${v.ov_bereikbaarheid.score}/5 (${v.reistijd_minuten} min)` },
  { label: "Notities", render: (v) => Storage.getNotities(v.id).map((n) => n.tekst).join("; ") || "—" },
];

function renderVergelijkenTabel() {
  const tabel = document.getElementById("vergelijken-tabel");
  const leegMelding = document.getElementById("vergelijken-leeg");
  const geselecteerd = state.vergelijklijst.map(vindVacature).filter(Boolean);

  if (geselecteerd.length === 0) {
    tabel.innerHTML = "";
    leegMelding.style.display = "block";
    return;
  }
  leegMelding.style.display = "none";

  const kopRij = `<tr><th>Criterium</th>${geselecteerd.map((v) => `<th>${v.schoolnaam}<button class="vergelijk-verwijder" data-id="${v.id}" aria-label="Verwijder uit vergelijking">×</button></th>`).join("")}</tr>`;
  const rijen = VERGELIJK_RIJEN.map((rij) => `<tr><td>${rij.label}</td>${geselecteerd.map((v) => `<td>${rij.render(v)}</td>`).join("")}</tr>`).join("");
  tabel.innerHTML = kopRij + rijen;

  tabel.querySelectorAll(".vergelijk-verwijder").forEach((btn) => btn.addEventListener("click", () => toggleVergelijk(btn.dataset.id)));
}

/* ---------- SOLLICITATIEHULP ---------- */

function renderSollicitatiehulp() {
  const grid = document.getElementById("sollicitatiehulp-grid");
  grid.innerHTML = SOLLICITATIEHULP_GROEPEN.map((g) => `
    <article class="sollicitatie-kaart">
      <h3>${g.thema}</h3>
      <ul>${g.vragen.map((q) => `<li>${q}</li>`).join("")}</ul>
    </article>
  `).join("");
}

/* ---------- DETAILMODAL ---------- */

function openDetailModal(id, opties = {}) {
  const v = vindVacature(id);
  if (!v) return;
  const overlay = document.getElementById("modal-detail");
  document.getElementById("modal-detail-inhoud").innerHTML = maakDetailInhoud(v);
  overlay.classList.remove("modal-overlay--verborgen");
  document.getElementById("modal-detail-titel")?.focus();
  bindDetailEvents(v);
  if (opties.focusNotitie) {
    document.getElementById("nieuwe-notitie")?.focus();
  }
}

function sluitModal() {
  document.getElementById("modal-detail").classList.add("modal-overlay--verborgen");
}

function maakDetailInhoud(v) {
  const m = v.match;
  const reflectie = Storage.getReflectie(v.id);
  const checklist = Storage.getChecklist(v.id);
  const notities = Storage.getNotities(v.id);

  return `
    <h2 id="modal-detail-titel" tabindex="-1">${v.schoolnaam} — ${v.functietitel}</h2>
    <p class="vacature-kaart__meta">${v.plaats} · ${v.regio} · gepubliceerd ${v.datum_gepubliceerd}</p>
    ${scoreBadge(m.totaal)}

    <section class="detail-sectie">
      <h3>Vacaturetekst</h3>
      <p>${v.vacaturetekst}</p>
    </section>

    <section class="detail-sectie">
      <h3>Schoolprofiel</h3>
      <ul class="detail-feitenlijst">
        <li><strong>Schoolgrootte:</strong> ${v.schoolgrootte} (${v.aantal_leerlingen} leerlingen)</li>
        <li><strong>Parallelgroepen:</strong> ${v.parallelgroepen ? "Ja" : "Nee"}</li>
        <li><strong>Onderwijsvisie:</strong> ${v.onderwijsvisie}</li>
        <li><strong>Begeleiding:</strong> ${v.begeleiding}</li>
        <li><strong>OV-bereikbaarheid:</strong> ${v.ov_bereikbaarheid.score}/5 — ${v.ov_bereikbaarheid.toelichting}</li>
        <li><strong>Reistijd vanuit Zoetermeer:</strong> ${v.reistijd_minuten} minuten</li>
      </ul>
    </section>

    <section class="detail-sectie">
      <h3>Waarom deze matchscore?</h3>
      <div class="score-uitleg">
        ${m.deelscores.map((d) => `
          <div class="score-uitleg__regel">
            <span class="score-uitleg__titel">${d.titel}</span>
            <div class="score-uitleg__balk"><div class="score-uitleg__vulling" style="width:${Math.round((d.punten / d.max) * 100)}%"></div></div>
            <span class="score-uitleg__label">${d.label}</span>
          </div>
        `).join("")}
      </div>
      <div class="score-samenvatting">
        ${m.pluspunten.length ? `<div><h4>Pluspunten</h4><ul>${m.pluspunten.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}
        ${m.aandachtspunten.length ? `<div><h4>Aandachtspunten</h4><ul>${m.aandachtspunten.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}
        ${m.risicos.length ? `<div><h4>Risico's</h4><ul>${m.risicos.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}
        <div><h4>Vragen voor het gesprek</h4><ul>${m.gespreksvragen.map((p) => `<li>${p}</li>`).join("")}</ul></div>
      </div>
    </section>

    <section class="detail-sectie">
      <h3>Checklist gesprek / meeloopdag</h3>
      <ul class="checklist">
        ${CHECKLIST_ITEMS.map((item) => `
          <li>
            <label>
              <input type="checkbox" data-checklist="${item.key}" ${checklist[item.key] ? "checked" : ""} />
              ${item.label}
            </label>
          </li>
        `).join("")}
      </ul>
    </section>

    <section class="detail-sectie">
      <h3>Reflectie na gesprek of meeloopdag</h3>
      ${reflectie ? `<p class="indruk-resultaat">Persoonlijke indruk: <strong>${berekenIndruk(reflectie)}%</strong> positief (laatst bijgewerkt ${new Date(reflectie.bijgewerkt).toLocaleDateString("nl-NL")})</p>` : ""}
      <form id="reflectie-formulier">
        ${REFLECTIE_STELLINGEN.map((st) => `
          <div class="reflectie-stelling">
            <span>${st.label}</span>
            <div class="reflectie-keuze">
              <label><input type="radio" name="${st.key}" value="ja" ${reflectie?.[st.key] === "ja" ? "checked" : ""}/> Ja</label>
              <label><input type="radio" name="${st.key}" value="twijfel" ${reflectie?.[st.key] === "twijfel" ? "checked" : ""}/> Twijfel</label>
              <label><input type="radio" name="${st.key}" value="nee" ${reflectie?.[st.key] === "nee" ? "checked" : ""}/> Nee</label>
            </div>
          </div>
        `).join("")}
        <label class="filter-veld">
          Vrije notities
          <textarea id="reflectie-vrije-tekst" rows="3">${reflectie?.vrije_tekst ?? ""}</textarea>
        </label>
        <button type="submit" class="knop knop--primair">Reflectie opslaan</button>
      </form>
    </section>

    <section class="detail-sectie">
      <h3>Notities</h3>
      <ul class="notities-lijst">
        ${notities.map((n) => `<li><span>${n.tekst}</span><time>${new Date(n.datum).toLocaleDateString("nl-NL")}</time></li>`).join("") || "<li>Nog geen notities.</li>"}
      </ul>
      <form id="notitie-formulier">
        <label class="filter-veld">
          Nieuwe notitie
          <textarea id="nieuwe-notitie" rows="2" placeholder="Bijv. indruk na telefonisch contact..."></textarea>
        </label>
        <button type="submit" class="knop knop--subtiel">Notitie toevoegen</button>
      </form>
    </section>
  `;
}

function berekenIndruk(reflectie) {
  const waarden = REFLECTIE_STELLINGEN.map((st) => reflectie[st.key]).filter(Boolean);
  if (waarden.length === 0) return 0;
  const punten = waarden.reduce((sum, w) => sum + (w === "ja" ? 1 : w === "twijfel" ? 0.5 : 0), 0);
  return Math.round((punten / waarden.length) * 100);
}

function bindDetailEvents(v) {
  document.querySelectorAll("[data-checklist]").forEach((cb) => {
    cb.addEventListener("change", () => Storage.zetChecklistItem(v.id, cb.dataset.checklist, cb.checked));
  });

  document.getElementById("reflectie-formulier").addEventListener("submit", (e) => {
    e.preventDefault();
    const reflectie = {};
    REFLECTIE_STELLINGEN.forEach((st) => {
      const gekozen = document.querySelector(`input[name="${st.key}"]:checked`);
      if (gekozen) reflectie[st.key] = gekozen.value;
    });
    reflectie.vrije_tekst = document.getElementById("reflectie-vrije-tekst").value;
    Storage.bewaarReflectie(v.id, reflectie);
    openDetailModal(v.id);
  });

  document.getElementById("notitie-formulier").addEventListener("submit", (e) => {
    e.preventDefault();
    const tekst = document.getElementById("nieuwe-notitie").value.trim();
    if (!tekst) return;
    Storage.voegNotitieToe(v.id, tekst);
    openDetailModal(v.id);
  });
}

/* ---------- TABS & GLOBALE EVENTS ---------- */

function bindGlobaleEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("actief"));
      tab.classList.add("actief");
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("view--actief"));
      document.getElementById(`view-${tab.dataset.view}`).classList.add("view--actief");
    });
  });

  document.getElementById("btn-profiel-toggle").addEventListener("click", (e) => {
    const chips = document.getElementById("profiel-chips");
    const verborgen = chips.classList.toggle("profiel-chips--verborgen");
    e.target.setAttribute("aria-expanded", String(!verborgen));
  });

  document.getElementById("btn-modal-sluiten").addEventListener("click", sluitModal);
  document.getElementById("modal-detail").addEventListener("click", (e) => {
    if (e.target.id === "modal-detail") sluitModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") sluitModal();
  });

  document.getElementById("btn-leeg-vergelijklijst").addEventListener("click", () => {
    state.vergelijklijst = Storage.leegVergelijklijst();
    renderVergelijkenTabel();
    renderGrid();
    bijwerkenVergelijkTeller();
  });

  bijwerkenVergelijkTeller();
}

init();
