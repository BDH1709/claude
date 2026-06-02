import { api } from '../api.js';
import { formatDate, formatBytes, getFileType, fileTypeIcon, fileTypeColors, fileTypeBadge, escapeHtml, debounce } from '../utils.js';

const CAT_META = {
  'inhoudsopgave': { label: 'Inhoudsopgave', desc: 'Overzicht en structuur van de klassenmap', color: '#6366f1', icon: 'book-open' },
  'studentgegevens': { label: 'Studentgegevens', desc: 'Persoonsgegevens en administratieve informatie', color: '#8b5cf6', icon: 'user' },
  'pop': { label: 'POP', desc: 'Persoonlijk Ontwikkelingsplan', color: '#0d9488', icon: 'target' },
  'planningen': { label: 'Planningen', desc: 'Lesplanningen en tijdschema\'s', color: '#f97316', icon: 'calendar' },
  'lesvoorbereidingen': { label: 'Lesvoorbereidingen', desc: 'Uitgewerkte lesplannen en didactisch materiaal', color: '#10b981', icon: 'book' },
  'toetsgegevens': { label: 'Toetsgegevens', desc: 'Toetsresultaten en beoordelingsoverzichten', color: '#ef4444', icon: 'clipboard-list' },
  'groepsoverzicht': { label: 'Groepsoverzicht', desc: 'Klassensamenstelling en groepsdynamiek', color: '#3b82f6', icon: 'users' },
  'bewijsmateriaal': { label: 'Bewijsmateriaal', desc: 'Onderbouwend materiaal en portfoliobewijs', color: '#f59e0b', icon: 'folder' },
  'geheimhouding': { label: 'Geheimhouding', desc: 'Vertrouwelijke documenten (beperkte toegang)', color: '#64748b', icon: 'lock' },
};

let _allDocs = [];
let _viewMode = localStorage.getItem('viewMode') || 'list';
let _sortKey = 'uploaded_at';
let _sortDir = -1;

export function renderCategory(params) {
  const { slug } = params;
  const meta = CAT_META[slug];
  const view = document.getElementById('view-root');
  document.getElementById('topbar-title').textContent = meta?.label || slug;

  view.innerHTML = `<div class="loading-state"><div class="spinner spinner-lg"></div></div>`;

  api.documents(slug).then(docs => {
    _allDocs = docs;
    view.innerHTML = buildCategoryView(slug, meta, docs);
    bindCategoryEvents(view, slug, meta);
  }).catch(() => {
    view.innerHTML = buildError(slug);
  });
}

function buildCategoryView(slug, meta, docs) {
  const color = meta?.color || '#0d9488';
  return `
    <div>
      <div class="breadcrumb">
        <span class="breadcrumb-item" onclick="window.App.navigate('/')">Dashboard</span>
        <span class="breadcrumb-sep">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
        <span class="breadcrumb-current">${escapeHtml(meta?.label || slug)}</span>
      </div>

      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-eyebrow">
            <span class="page-header-eyebrow-dot" style="background:${color}"></span>
            Categorie
          </div>
          <h1 class="page-header-title">${escapeHtml(meta?.label || slug)}</h1>
          <p class="page-header-desc">${escapeHtml(meta?.desc || '')}</p>
        </div>
        <div style="flex-shrink:0">
          <button class="btn btn-primary" id="cat-upload-btn" data-cat="${escapeHtml(slug)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Document toevoegen
          </button>
        </div>
      </div>

      <div class="doc-controls">
        <div class="doc-search">
          <span class="doc-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="search" id="cat-search" placeholder="Zoek in ${escapeHtml(meta?.label || slug)}..." autocomplete="off">
        </div>
        <div class="view-toggle">
          <button class="view-toggle-btn ${_viewMode === 'list' ? 'active' : ''}" id="view-list" title="Lijstweergave">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          <button class="view-toggle-btn ${_viewMode === 'grid' ? 'active' : ''}" id="view-grid" title="Rasterweergave">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
        </div>
        <span class="text-muted" id="doc-count">${docs.length} document${docs.length !== 1 ? 'en' : ''}</span>
      </div>

      <div id="doc-list-container">
        ${renderDocList(docs)}
      </div>
    </div>
  `;
}

function renderDocList(docs) {
  if (!docs.length) return buildEmpty();

  if (_viewMode === 'grid') {
    return `
      <div class="doc-grid">
        ${docs.map(doc => buildGridCard(doc)).join('')}
      </div>
    `;
  }

  return `
    <div class="doc-table">
      <div class="doc-table-header" style="display:grid;grid-template-columns:40px 1fr 130px 80px 90px 80px">
        <th></th>
        <th data-sort="title" style="cursor:pointer">Naam ${_sortKey === 'title' ? (_sortDir > 0 ? '↑' : '↓') : ''}</th>
        <th data-sort="uploaded_at" style="cursor:pointer">Datum ${_sortKey === 'uploaded_at' ? (_sortDir > 0 ? '↑' : '↓') : ''}</th>
        <th data-sort="file_size" style="cursor:pointer">Grootte ${_sortKey === 'file_size' ? (_sortDir > 0 ? '↑' : '↓') : ''}</th>
        <th>Type</th>
        <th></th>
      </div>
      ${docs.map(doc => buildDocRow(doc)).join('')}
    </div>
  `;
}

function buildDocRow(doc) {
  const ft = getFileType(doc.original_filename, doc.content_type);
  const colors = fileTypeColors(ft);
  const badge = fileTypeBadge(ft);
  return `
    <div class="doc-row" data-id="${escapeHtml(doc.id)}" style="display:grid;grid-template-columns:40px 1fr 130px 80px 90px 80px;align-items:center;padding:0 var(--sp-5);min-height:60px">
      <td>
        <div class="doc-file-icon" style="background:${colors.bg};color:${colors.color}">
          ${fileTypeIcon(ft, 'currentColor')}
        </div>
      </td>
      <td>
        <div class="doc-name">
          <div class="doc-name-title">${escapeHtml(doc.title)}</div>
          <div class="doc-name-filename">${escapeHtml(doc.original_filename)}</div>
        </div>
      </td>
      <td style="font-size:var(--text-sm);color:var(--text-secondary)">${formatDate(doc.uploaded_at)}</td>
      <td style="font-size:var(--text-sm);color:var(--text-muted)">${formatBytes(doc.file_size)}</td>
      <td><span class="badge ${badge.cls}">${badge.label}</span></td>
      <td>
        <div class="doc-row-actions">
          <a href="/api/documents/${escapeHtml(doc.id)}/download" download class="btn btn-icon btn-ghost btn-sm" title="Downloaden" onclick="event.stopPropagation()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button class="btn btn-icon btn-ghost btn-sm doc-delete-btn" data-id="${escapeHtml(doc.id)}" title="Verwijderen" onclick="event.stopPropagation()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </div>
  `;
}

function buildGridCard(doc) {
  const ft = getFileType(doc.original_filename, doc.content_type);
  const colors = fileTypeColors(ft);
  return `
    <div class="doc-grid-card" data-id="${escapeHtml(doc.id)}">
      <div class="doc-grid-thumb" style="background:${colors.bg};color:${colors.color}">
        ${fileTypeIcon(ft, 'currentColor')}
      </div>
      <div class="doc-grid-body">
        <div class="doc-grid-name">${escapeHtml(doc.title)}</div>
        <div class="doc-grid-meta">${formatDate(doc.uploaded_at)} · ${formatBytes(doc.file_size)}</div>
      </div>
    </div>
  `;
}

function buildEmpty() {
  return `
    <div class="card">
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="empty-state-title">Nog geen documenten</div>
        <div class="empty-state-desc">Voeg je eerste document toe aan deze map door op de uploadknop te klikken.</div>
        <button class="btn btn-primary" id="empty-upload-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Document toevoegen
        </button>
      </div>
    </div>
  `;
}

function buildError() {
  return `
    <div class="empty-state">
      <div class="empty-state-title">Fout bij laden</div>
      <button class="btn btn-secondary" onclick="window.location.reload()">Opnieuw</button>
    </div>
  `;
}

function filterDocs(query) {
  if (!query) return _allDocs;
  const q = query.toLowerCase();
  return _allDocs.filter(d =>
    d.title?.toLowerCase().includes(q) ||
    d.original_filename?.toLowerCase().includes(q) ||
    d.description?.toLowerCase().includes(q) ||
    d.tags?.some(t => t.toLowerCase().includes(q))
  );
}

function sortDocs(docs) {
  return [...docs].sort((a, b) => {
    const av = a[_sortKey] ?? '';
    const bv = b[_sortKey] ?? '';
    if (av < bv) return -_sortDir;
    if (av > bv) return _sortDir;
    return 0;
  });
}

function refreshList(view, query = '') {
  const container = view.querySelector('#doc-list-container');
  if (!container) return;
  const filtered = sortDocs(filterDocs(query));
  const count = view.querySelector('#doc-count');
  if (count) count.textContent = `${filtered.length} document${filtered.length !== 1 ? 'en' : ''}`;
  container.innerHTML = renderDocList(filtered);
  bindListEvents(view, query);
}

function bindListEvents(view, query = '') {
  view.querySelectorAll('.doc-row, .doc-grid-card').forEach(el => {
    el.addEventListener('click', () => window.App.navigate(`/document/${el.dataset.id}`));
  });
  view.querySelectorAll('.doc-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;
      try {
        await api.delete(btn.dataset.id);
        _allDocs = _allDocs.filter(d => d.id !== btn.dataset.id);
        refreshList(view, query);
        window.App.toast('success', 'Verwijderd', 'Document is verwijderd.');
      } catch (err) {
        window.App.toast('error', 'Fout', err.message);
      }
    });
  });
  view.querySelectorAll('[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (_sortKey === key) _sortDir *= -1;
      else { _sortKey = key; _sortDir = -1; }
      refreshList(view, view.querySelector('#cat-search')?.value || '');
    });
  });
  const emptyBtn = view.querySelector('#empty-upload-btn');
  if (emptyBtn) {
    const slug = view.querySelector('[data-cat]')?.dataset.cat;
    emptyBtn.addEventListener('click', () => window.App.openUpload(slug));
  }
}

function bindCategoryEvents(view, slug) {
  const uploadBtn = view.querySelector('#cat-upload-btn');
  if (uploadBtn) uploadBtn.addEventListener('click', () => window.App.openUpload(slug));

  const searchInput = view.querySelector('#cat-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      refreshList(view, e.target.value);
    }, 200));
  }

  const listBtn = view.querySelector('#view-list');
  const gridBtn = view.querySelector('#view-grid');
  if (listBtn) listBtn.addEventListener('click', () => {
    _viewMode = 'list';
    localStorage.setItem('viewMode', 'list');
    listBtn.classList.add('active'); gridBtn?.classList.remove('active');
    refreshList(view, searchInput?.value || '');
  });
  if (gridBtn) gridBtn.addEventListener('click', () => {
    _viewMode = 'grid';
    localStorage.setItem('viewMode', 'grid');
    gridBtn.classList.add('active'); listBtn?.classList.remove('active');
    refreshList(view, searchInput?.value || '');
  });

  bindListEvents(view);
}
