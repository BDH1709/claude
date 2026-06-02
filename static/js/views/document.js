import { api } from '../api.js';
import { formatDateFull, formatBytes, getFileType, fileTypeIcon, fileTypeColors, fileTypeBadge, escapeHtml } from '../utils.js';

const CAT_META = {
  'inhoudsopgave': 'Inhoudsopgave',
  'studentgegevens': 'Studentgegevens',
  'pop': 'POP',
  'planningen': 'Planningen',
  'lesvoorbereidingen': 'Lesvoorbereidingen',
  'toetsgegevens': 'Toetsgegevens',
  'groepsoverzicht': 'Groepsoverzicht',
  'bewijsmateriaal': 'Bewijsmateriaal',
  'geheimhouding': 'Geheimhouding',
};

export function renderDocument(params) {
  const { id } = params;
  const view = document.getElementById('view-root');
  document.getElementById('topbar-title').textContent = 'Document';
  view.innerHTML = `<div class="loading-state"><div class="spinner spinner-lg"></div></div>`;

  api.document(id).then(doc => {
    document.getElementById('topbar-title').textContent = doc.title;
    view.innerHTML = buildDocDetail(doc);
    bindDocEvents(view, doc);
  }).catch(() => {
    view.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Document niet gevonden</div>
        <button class="btn btn-secondary" onclick="history.back()">Terug</button>
      </div>
    `;
  });
}

function buildDocDetail(doc) {
  const ft = getFileType(doc.original_filename, doc.content_type);
  const colors = fileTypeColors(ft);
  const badge = fileTypeBadge(ft);
  const catLabel = CAT_META[doc.category] || doc.category;

  return `
    <div>
      <div class="breadcrumb">
        <span class="breadcrumb-item" onclick="window.App.navigate('/')">Dashboard</span>
        <span class="breadcrumb-sep">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
        <span class="breadcrumb-item" onclick="window.App.navigate('/category/${escapeHtml(doc.category)}')">${escapeHtml(catLabel)}</span>
        <span class="breadcrumb-sep">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
        <span class="breadcrumb-current">${escapeHtml(doc.title)}</span>
      </div>

      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-eyebrow">
            <span class="badge ${badge.cls}">${badge.label}</span>
          </div>
          <h1 class="page-header-title">${escapeHtml(doc.title)}</h1>
          ${doc.description ? `<p class="page-header-desc">${escapeHtml(doc.description)}</p>` : ''}
        </div>
        <div style="display:flex;gap:var(--sp-3);flex-shrink:0">
          <a href="/api/documents/${escapeHtml(doc.id)}/download" download class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Downloaden
          </a>
          <button class="btn btn-secondary" id="doc-delete-btn" data-id="${escapeHtml(doc.id)}" data-cat="${escapeHtml(doc.category)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Verwijderen
          </button>
        </div>
      </div>

      <div class="doc-detail">
        <div class="doc-preview-area">
          ${buildPreview(doc, ft, colors)}
        </div>

        <aside class="doc-meta-panel">
          <div class="card">
            <div class="card-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span class="card-title">Documentinfo</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--sp-5)">
              <div class="meta-row">
                <span class="meta-label">Bestandsnaam</span>
                <span class="meta-value">${escapeHtml(doc.original_filename)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Categorie</span>
                <span class="meta-value">${escapeHtml(catLabel)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Bestandstype</span>
                <span class="meta-value"><span class="badge ${badge.cls}">${badge.label}</span></span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Grootte</span>
                <span class="meta-value">${formatBytes(doc.file_size)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Geüpload op</span>
                <span class="meta-value">${formatDateFull(doc.uploaded_at)}</span>
              </div>
              ${doc.tags?.length ? `
              <div class="meta-row">
                <span class="meta-label">Labels</span>
                <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-top:var(--sp-1)">
                  ${doc.tags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}
                </div>
              </div>` : ''}
            </div>
          </div>

          <button class="btn btn-secondary" style="width:100%" onclick="window.App.navigate('/category/${escapeHtml(doc.category)}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Terug naar ${escapeHtml(catLabel)}
          </button>
        </aside>
      </div>
    </div>
  `;
}

function buildPreview(doc, ft, colors) {
  if (ft === 'img') {
    return `
      <img src="/api/documents/${escapeHtml(doc.id)}/download"
           alt="${escapeHtml(doc.title)}"
           style="max-width:100%;max-height:600px;object-fit:contain;padding:var(--sp-6)">
    `;
  }
  if (ft === 'pdf') {
    return `
      <iframe src="/api/documents/${escapeHtml(doc.id)}/download"
              style="width:100%;height:600px;border:none"
              title="${escapeHtml(doc.title)}">
      </iframe>
    `;
  }
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--sp-4);padding:var(--sp-16);color:${colors.color}">
      <div style="width:80px;height:80px;background:${colors.bg};border-radius:var(--r-xl);display:flex;align-items:center;justify-content:center">
        ${fileTypeIcon(ft, colors.color).replace('width="18"', 'width="36"').replace('height="18"', 'height="36"')}
      </div>
      <div style="text-align:center">
        <div style="font-size:var(--text-base);font-weight:var(--fw-semibold);color:var(--text-primary);margin-bottom:var(--sp-2)">${escapeHtml(doc.original_filename)}</div>
        <div style="font-size:var(--text-sm);color:var(--text-muted)">Geen voorvertoning beschikbaar voor dit bestandstype</div>
      </div>
      <a href="/api/documents/${escapeHtml(doc.id)}/download" download class="btn btn-primary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Bestand downloaden
      </a>
    </div>
  `;
}

function bindDocEvents(view, doc) {
  const deleteBtn = view.querySelector('#doc-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;
      try {
        await api.delete(doc.id);
        window.App.toast('success', 'Verwijderd', 'Document is verwijderd.');
        window.App.navigate(`/category/${doc.category}`);
      } catch (err) {
        window.App.toast('error', 'Fout', err.message);
      }
    });
  }
}
