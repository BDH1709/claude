import { api } from '../api.js';
import { setState } from '../store.js';
import { formatDate, formatBytes, getFileType, fileTypeIcon, fileTypeColors, escapeHtml } from '../utils.js';

const ICONS = {
  'book-open': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  'user': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'target': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  'calendar': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  'book': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  'clipboard-list': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  'users': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'folder': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  'lock': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

export function renderDashboard() {
  const view = document.getElementById('view-root');
  view.innerHTML = `<div class="loading-state"><div class="spinner spinner-lg"></div></div>`;
  document.getElementById('topbar-title').textContent = 'Dashboard';

  api.stats().then(data => {
    setState({ stats: data, categories: data.categories });
    view.innerHTML = buildDashboard(data);
    bindDashboardEvents(view);
  }).catch(() => {
    view.innerHTML = buildError('Kon statistieken niet laden');
  });
}

function buildDashboard(data) {
  const recentDocs = [];

  return `
    <div class="stats-grid">
      ${buildStatCard('Documenten', data.total_documents, `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      `, 'var(--accent-light)', 'var(--accent)', 'Totaal geüpload', data.last_upload ? `Laatste: ${formatDate(data.last_upload)}` : 'Nog niets geüpload')}
      ${buildStatCard('Mappen actief', data.categories_with_files, `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      `, '#dbeafe', '#3b82f6', 'van de 9 categorieën', `${9 - data.categories_with_files} nog leeg`)}
      ${buildStatCard('Laatste upload', data.last_upload ? formatDate(data.last_upload) : '—', `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      `, '#fef3c7', '#d97706', 'Datum activiteit', data.last_upload ? new Date(data.last_upload).toLocaleDateString('nl-NL') : 'Geen activiteit')}
    </div>

    <div class="categories-section">
      <div class="section-header">
        <h2 class="section-title">Mappen</h2>
        <span class="text-muted">${data.total_documents} documenten verspreid over ${data.categories_with_files} mappen</span>
      </div>
      <div class="categories-grid">
        ${data.categories.map(cat => buildCategoryCard(cat)).join('')}
      </div>
    </div>

    ${data.total_documents > 0 ? `
    <div class="card">
      <div class="card-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span class="card-title">Recente activiteit</span>
      </div>
      <div id="recent-docs-container">
        <div class="loading-state" style="padding: var(--sp-8);">
          <div class="spinner"></div>
        </div>
      </div>
    </div>` : ''}
  `;
}

function buildStatCard(label, value, iconSvg, iconBg, iconColor, sub1, sub2) {
  return `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-label">${escapeHtml(label)}</span>
        <div class="stat-card-icon" style="background:${iconBg};color:${iconColor}">${iconSvg}</div>
      </div>
      <div class="stat-card-value">${escapeHtml(String(value))}</div>
      <div>
        <div class="stat-card-sub">${escapeHtml(sub1)}</div>
        <div class="stat-card-sub" style="margin-top:2px">${escapeHtml(sub2)}</div>
      </div>
    </div>
  `;
}

function buildCategoryCard(cat) {
  return `
    <div class="category-card" style="--cat-color:${cat.color}" data-cat="${escapeHtml(cat.slug)}">
      <div class="category-card-top">
        <div class="category-card-icon" style="background:${cat.color}18;color:${cat.color}">
          ${ICONS[cat.icon] || ICONS['folder']}
        </div>
        <div class="category-card-count">${cat.document_count}</div>
      </div>
      <div class="category-card-name">${escapeHtml(cat.label)}</div>
      <div class="category-card-desc">${escapeHtml(cat.description)}</div>
      <div class="category-card-footer">
        <span class="category-card-footer-label">${cat.last_upload ? formatDate(cat.last_upload) : 'Nog leeg'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${cat.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  `;
}

function buildError(msg) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon" style="color:var(--danger)">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="empty-state-title">Fout bij laden</div>
      <div class="empty-state-desc">${escapeHtml(msg)}</div>
      <button class="btn btn-secondary" onclick="window.App.navigate('/')">Opnieuw proberen</button>
    </div>
  `;
}

function bindDashboardEvents(view) {
  view.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      window.App.navigate(`/category/${card.dataset.cat}`);
    });
  });

  // Load recent docs async
  const container = view.querySelector('#recent-docs-container');
  if (!container) return;
  api.documents().then(docs => {
    if (!docs.length) { container.closest('.card').remove(); return; }
    const recent = docs.slice(0, 8);
    container.innerHTML = `
      <div class="activity-list">
        ${recent.map(doc => buildActivityItem(doc)).join('')}
      </div>
    `;
    container.querySelectorAll('.activity-item').forEach(item => {
      item.addEventListener('click', () => {
        window.App.navigate(`/document/${item.dataset.id}`);
      });
    });
  }).catch(() => { if (container) container.closest('.card')?.remove(); });
}

function buildActivityItem(doc) {
  const ft = getFileType(doc.original_filename, doc.content_type);
  const colors = fileTypeColors(ft);
  return `
    <div class="activity-item" data-id="${escapeHtml(doc.id)}">
      <div class="activity-icon" style="background:${colors.bg};color:${colors.color}">
        ${fileTypeIcon(ft, 'currentColor')}
      </div>
      <div class="activity-content">
        <div class="activity-name">${escapeHtml(doc.title)}</div>
        <div class="activity-meta">
          <span>${escapeHtml(doc.category)}</span>
          <span class="activity-meta-dot"></span>
          <span>${formatDate(doc.uploaded_at)}</span>
          <span class="activity-meta-dot"></span>
          <span>${formatBytes(doc.file_size)}</span>
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  `;
}
