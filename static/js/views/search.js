import { api } from '../api.js';
import { formatDate, formatBytes, getFileType, fileTypeIcon, fileTypeColors, fileTypeBadge, escapeHtml, highlightText, debounce } from '../utils.js';

const CAT_META = {
  'inhoudsopgave': 'Inhoudsopgave', 'studentgegevens': 'Studentgegevens',
  'pop': 'POP', 'planningen': 'Planningen', 'lesvoorbereidingen': 'Lesvoorbereidingen',
  'toetsgegevens': 'Toetsgegevens', 'groepsoverzicht': 'Groepsoverzicht',
  'bewijsmateriaal': 'Bewijsmateriaal', 'geheimhouding': 'Geheimhouding',
};

export function renderSearch(query = '') {
  const view = document.getElementById('view-root');
  document.getElementById('topbar-title').textContent = 'Zoeken';

  view.innerHTML = `
    <div>
      <div class="page-header" style="margin-bottom:var(--sp-6)">
        <div class="page-header-left">
          <h1 class="page-header-title">Zoeken</h1>
          <p class="page-header-desc">Doorzoek alle documenten in de klassenmap</p>
        </div>
      </div>
      <div class="card" style="padding:var(--sp-5);margin-bottom:var(--sp-6)">
        <div style="position:relative">
          <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="search" id="search-input" value="${escapeHtml(query)}"
            placeholder="Zoek op naam, beschrijving of label..."
            autocomplete="off" autofocus
            style="width:100%;height:48px;padding:0 var(--sp-4) 0 44px;border:1.5px solid var(--border);border-radius:var(--r-md);font-size:var(--text-base);background:var(--bg-surface);color:var(--text-primary);outline:none;transition:border-color var(--t-base),box-shadow var(--t-base)"
          >
        </div>
      </div>
      <div id="search-results"></div>
    </div>
  `;

  const input = view.querySelector('#search-input');
  const resultsEl = view.querySelector('#search-results');

  input.addEventListener('focus', (e) => {
    e.target.style.borderColor = 'var(--accent)';
    e.target.style.boxShadow = '0 0 0 3px rgba(13 148 136 / .12)';
  });
  input.addEventListener('blur', (e) => {
    e.target.style.borderColor = 'var(--border)';
    e.target.style.boxShadow = 'none';
  });

  const doSearch = debounce(async (q) => {
    if (!q.trim()) {
      resultsEl.innerHTML = buildEmptySearch();
      return;
    }
    resultsEl.innerHTML = `<div class="loading-state"><div class="spinner"></div><span>Zoeken...</span></div>`;
    try {
      const data = await api.search(q);
      resultsEl.innerHTML = buildResults(data, q);
      resultsEl.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => window.App.navigate(`/document/${el.dataset.id}`));
      });
    } catch (err) {
      resultsEl.innerHTML = `<div class="empty-state"><div class="empty-state-title">Zoekfout</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
    }
  }, 300);

  input.addEventListener('input', (e) => doSearch(e.target.value));

  if (query) doSearch(query);
  else resultsEl.innerHTML = buildEmptySearch();
}

function buildEmptySearch() {
  return `
    <div class="empty-state" style="padding:var(--sp-12) var(--sp-8)">
      <div class="empty-state-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <div class="empty-state-title">Typ om te zoeken</div>
      <div class="empty-state-desc">Zoek op documentnaam, beschrijving, categorie of labels</div>
    </div>
  `;
}

function buildResults(data, q) {
  if (!data.total) {
    return `
      <div class="empty-state" style="padding:var(--sp-12) var(--sp-8)">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div class="empty-state-title">Geen resultaten</div>
        <div class="empty-state-desc">Geen documenten gevonden voor "<strong>${escapeHtml(q)}</strong>"</div>
      </div>
    `;
  }

  return `
    <div class="search-header">
      <div class="search-query-display">Resultaten voor "<strong>${escapeHtml(q)}</strong>"</div>
      <div class="search-result-count">${data.total} document${data.total !== 1 ? 'en' : ''} gevonden</div>
    </div>
    <div class="doc-table">
      ${data.documents.map(doc => buildSearchRow(doc, q)).join('')}
    </div>
  `;
}

function buildSearchRow(doc, q) {
  const ft = getFileType(doc.original_filename, doc.content_type);
  const colors = fileTypeColors(ft);
  const badge = fileTypeBadge(ft);
  const catLabel = CAT_META[doc.category] || doc.category;

  return `
    <div class="doc-row" data-id="${escapeHtml(doc.id)}" style="display:grid;grid-template-columns:40px 1fr 120px 80px 80px;align-items:center;padding:0 var(--sp-5);min-height:64px;cursor:pointer">
      <td>
        <div class="doc-file-icon" style="background:${colors.bg};color:${colors.color}">
          ${fileTypeIcon(ft, 'currentColor')}
        </div>
      </td>
      <td>
        <div class="doc-name">
          <div class="doc-name-title">${highlightText(doc.title, q)}</div>
          <div class="doc-name-filename" style="display:flex;align-items:center;gap:var(--sp-2)">
            <span>${escapeHtml(catLabel)}</span>
            <span style="color:var(--border)">·</span>
            <span>${escapeHtml(doc.original_filename)}</span>
          </div>
        </div>
      </td>
      <td style="font-size:var(--text-sm);color:var(--text-secondary)">${formatDate(doc.uploaded_at)}</td>
      <td style="font-size:var(--text-sm);color:var(--text-muted)">${formatBytes(doc.file_size)}</td>
      <td><span class="badge ${badge.cls}">${badge.label}</span></td>
    </div>
  `;
}
