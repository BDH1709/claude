const BASE = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  stats: () => request('/api/stats'),
  categories: () => request('/api/categories'),

  documents: (category) =>
    request(category ? `/api/categories/${category}/documents` : '/api/documents'),

  document: (id) => request(`/api/documents/${id}`),

  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),

  delete: (id) => request(`/api/documents/${id}`, { method: 'DELETE' }),

  upload(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(new Error('Ongeldige serverrespons')); }
        } else {
          let msg = `HTTP ${xhr.status}`;
          try { msg = JSON.parse(xhr.responseText).detail || msg; } catch (_) {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Netwerkfout bij uploaden'));
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.send(formData);
    });
  },

  downloadUrl: (id) => `/api/documents/${id}/download`,
};
