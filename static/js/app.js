import { route, navigate, startRouter, getCurrentPath } from './router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderCategory } from './views/category.js';
import { renderDocument } from './views/document.js';
import { renderSearch } from './views/search.js';
import { openUploadModal, closeUploadModal } from './upload-modal.js';
import { debounce } from './utils.js';

const CATEGORIES = [
  { slug: 'inhoudsopgave', label: 'Inhoudsopgave', color: '#6366f1', icon: 'book-open' },
  { slug: 'studentgegevens', label: 'Studentgegevens', color: '#8b5cf6', icon: 'user' },
  { slug: 'pop', label: 'POP', color: '#0d9488', icon: 'target' },
  { slug: 'planningen', label: 'Planningen', color: '#f97316', icon: 'calendar' },
  { slug: 'lesvoorbereidingen', label: 'Lesvoorbereidingen', color: '#10b981', icon: 'book' },
  { slug: 'toetsgegevens', label: 'Toetsgegevens', color: '#ef4444', icon: 'clipboard-list' },
  { slug: 'groepsoverzicht', label: 'Groepsoverzicht', color: '#3b82f6', icon: 'users' },
  { slug: 'bewijsmateriaal', label: 'Bewijsmateriaal', color: '#f59e0b', icon: 'folder' },
  { slug: 'geheimhouding', label: 'Geheimhouding', color: '#64748b', icon: 'lock' },
];

const SIDEBAR_ICONS = {
  'book-open': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  'user': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'target': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  'calendar': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  'book': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  'clipboard-list': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  'users': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'folder': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  'lock': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

function buildSidebarNav(activePath) {
  const homeActive = activePath === '/';
  const searchActive = activePath === '/search';
  return `
    <button class="sidebar-link ${homeActive ? 'active' : ''}" onclick="window.App.navigate('/')">
      <span class="sidebar-link-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </span>
      Dashboard
    </button>
    <button class="sidebar-link ${searchActive ? 'active' : ''}" onclick="window.App.navigate('/search')">
      <span class="sidebar-link-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      Zoeken
    </button>

    <div class="sidebar-section-label">Mappen</div>

    ${CATEGORIES.map(cat => {
      const isActive = activePath === `/category/${cat.slug}`;
      return `
        <button class="sidebar-link ${isActive ? 'active' : ''}" onclick="window.App.navigate('/category/${cat.slug}')">
          <span class="sidebar-cat-dot" style="background:${cat.color}"></span>
          ${cat.label}
        </button>
      `;
    }).join('')}
  `;
}

function updateSidebar(path) {
  const nav = document.getElementById('sidebar-nav');
  if (nav) nav.innerHTML = buildSidebarNav(path);
}

// ---- Toast ----
let _toastTimer = null;
function showToast(type, title, desc = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---- App API ----
window.App = {
  navigate(path) {
    navigate(path);
  },
  openUpload(category = '') {
    openUploadModal(category, (doc) => {
      const path = getCurrentPath();
      if (path === '/' || path === '') renderDashboard();
      else if (path === `/category/${doc.category}`) renderCategory({ slug: doc.category });
    });
  },
  toast: showToast,
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('visible');
  },
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('visible');
  },
};

// ---- Global search ----
const globalSearch = document.getElementById('global-search');
if (globalSearch) {
  globalSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = globalSearch.value.trim();
      navigate(`/search`);
      setTimeout(() => {
        if (q) renderSearch(q);
      }, 50);
    }
  });
  globalSearch.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    if (q.length >= 2) {
      const path = getCurrentPath();
      if (!path.startsWith('/search')) navigate('/search');
      renderSearch(q);
    }
  }, 350));
}

// ---- Routes ----
route('/', () => { updateSidebar('/'); renderDashboard(); });
route('/search', () => { updateSidebar('/search'); renderSearch(); });
route('/category/:slug', (p) => { updateSidebar(`/category/${p.slug}`); renderCategory(p); });
route('/document/:id', (p) => { renderDocument(p); });

// ---- Init ----
updateSidebar('/');
startRouter();
