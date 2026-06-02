export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH === 0) {
      const diffM = Math.floor(diffMs / 60000);
      return diffM <= 1 ? 'zojuist' : `${diffM} min. geleden`;
    }
    return `${diffH} uur geleden`;
  }
  if (diffDays === 1) return 'gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined });
}

export function formatDateFull(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getFileType(filename, contentType) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'img';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'vid';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'aud';
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
  if (['txt', 'md'].includes(ext)) return 'txt';
  return 'file';
}

export function fileTypeBadge(type) {
  const map = {
    pdf: { cls: 'badge-pdf', label: 'PDF' },
    doc: { cls: 'badge-doc', label: 'Word' },
    xls: { cls: 'badge-xls', label: 'Excel' },
    ppt: { cls: 'badge-ppt', label: 'PowerPoint' },
    img: { cls: 'badge-img', label: 'Afbeelding' },
    vid: { cls: 'badge-default', label: 'Video' },
    aud: { cls: 'badge-default', label: 'Audio' },
    zip: { cls: 'badge-default', label: 'Archief' },
    txt: { cls: 'badge-default', label: 'Tekst' },
    file: { cls: 'badge-default', label: 'Bestand' },
  };
  return map[type] || map.file;
}

export function fileTypeIcon(type, color = 'currentColor') {
  const icons = {
    pdf: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
    doc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    xls: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 12 17 16 13"/></svg>`,
    img: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    vid: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    file: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  };
  return icons[type] || icons.file;
}

export function fileTypeColors(type) {
  const map = {
    pdf: { bg: '#fee2e2', color: '#dc2626' },
    doc: { bg: '#dbeafe', color: '#2563eb' },
    xls: { bg: '#d1fae5', color: '#059669' },
    ppt: { bg: '#ffedd5', color: '#ea580c' },
    img: { bg: '#f3e8ff', color: '#9333ea' },
    vid: { bg: '#fce7f3', color: '#db2777' },
    aud: { bg: '#ecfdf5', color: '#10b981' },
    zip: { bg: '#fef3c7', color: '#d97706' },
    txt: { bg: '#f8fafc', color: '#64748b' },
    file: { bg: '#f8fafc', color: '#64748b' },
  };
  return map[type] || map.file;
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function highlightText(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(q, 'gi'), m => `<mark class="search-highlight">${m}</mark>`);
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}
