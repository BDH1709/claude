import { api } from './api.js';
import { formatBytes, escapeHtml } from './utils.js';

const CATEGORIES = [
  { slug: 'inhoudsopgave', label: 'Inhoudsopgave' },
  { slug: 'studentgegevens', label: 'Studentgegevens' },
  { slug: 'pop', label: 'POP' },
  { slug: 'planningen', label: 'Planningen' },
  { slug: 'lesvoorbereidingen', label: 'Lesvoorbereidingen' },
  { slug: 'toetsgegevens', label: 'Toetsgegevens' },
  { slug: 'groepsoverzicht', label: 'Groepsoverzicht' },
  { slug: 'bewijsmateriaal', label: 'Bewijsmateriaal' },
  { slug: 'geheimhouding', label: 'Geheimhouding' },
];

let _tags = [];
let _selectedFile = null;
let _onSuccess = null;

export function openUploadModal(defaultCategory = '', onSuccess) {
  _tags = [];
  _selectedFile = null;
  _onSuccess = onSuccess;

  const root = document.getElementById('modal-root');
  root.innerHTML = buildModal(defaultCategory);
  bindModalEvents(root);

  document.body.style.overflow = 'hidden';
}

export function closeUploadModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  document.body.style.overflow = '';
  _tags = [];
  _selectedFile = null;
}

function buildModal(defaultCategory) {
  return `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title-text">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title-text">Document uploaden</h2>
          <button class="modal-close" id="modal-close-btn" aria-label="Sluiten">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="drop-zone" id="drop-zone">
            <input type="file" id="file-input" accept="*/*">
            <div class="drop-zone-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="drop-zone-title">Sleep een bestand hierheen</div>
            <div class="drop-zone-sub">of <span>blader door bestanden</span></div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--sp-2)">Max. 50 MB · PDF, Word, Excel, afbeeldingen en meer</div>
          </div>
          <div id="selected-file-display"></div>

          <div style="margin-top:var(--sp-5)">
            <div class="form-group">
              <label class="form-label" for="upload-category">Categorie <span class="required">*</span></label>
              <select class="form-select" id="upload-category" required>
                <option value="">Selecteer een categorie...</option>
                ${CATEGORIES.map(c => `<option value="${c.slug}" ${c.slug === defaultCategory ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="upload-title">Titel</label>
              <input type="text" class="form-input" id="upload-title" placeholder="Optionele titel (standaard: bestandsnaam)">
            </div>

            <div class="form-group">
              <label class="form-label" for="upload-description">Beschrijving</label>
              <textarea class="form-textarea" id="upload-description" placeholder="Korte beschrijving van het document..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="tags-field">Labels</label>
              <div class="tags-input" id="tags-container">
                <div id="tags-chips"></div>
                <input type="text" class="tags-input-field" id="tags-field" placeholder="Label toevoegen, druk Enter...">
              </div>
              <div class="form-hint">Druk Enter of komma om een label toe te voegen</div>
            </div>
          </div>

          <div id="upload-progress-container" style="display:none">
            <div class="upload-progress">
              <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--sp-2)">
                <span>Uploaden...</span>
                <span id="upload-pct">0%</span>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" id="progress-bar" style="width:0%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">Annuleren</button>
          <button class="btn btn-primary" id="modal-submit-btn" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Uploaden
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindModalEvents(root) {
  const overlay = root.querySelector('#modal-overlay');
  const closeBtn = root.querySelector('#modal-close-btn');
  const cancelBtn = root.querySelector('#modal-cancel-btn');
  const submitBtn = root.querySelector('#modal-submit-btn');
  const dropZone = root.querySelector('#drop-zone');
  const fileInput = root.querySelector('#file-input');
  const tagsField = root.querySelector('#tags-field');

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeUploadModal();
  });
  closeBtn.addEventListener('click', closeUploadModal);
  cancelBtn.addEventListener('click', closeUploadModal);

  document.addEventListener('keydown', onEsc, { once: true });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file) setFile(file, root);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0], root);
  });

  // Tags
  tagsField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagsField.value.trim(), root);
    }
    if (e.key === 'Backspace' && !tagsField.value && _tags.length) {
      _tags.pop();
      renderTags(root);
    }
  });
  tagsField.addEventListener('blur', () => {
    if (tagsField.value.trim()) addTag(tagsField.value.trim(), root);
  });

  // Submit
  submitBtn.addEventListener('click', () => doUpload(root));

  // Enable button when file and category selected
  const checkReady = () => {
    const cat = root.querySelector('#upload-category')?.value;
    submitBtn.disabled = !(_selectedFile && cat);
  };
  root.querySelector('#upload-category').addEventListener('change', checkReady);
}

function onEsc(e) {
  if (e.key === 'Escape') closeUploadModal();
}

function setFile(file, root) {
  _selectedFile = file;
  const display = root.querySelector('#selected-file-display');
  display.innerHTML = `
    <div class="selected-file">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <span class="selected-file-name">${escapeHtml(file.name)}</span>
      <span class="selected-file-size">${formatBytes(file.size)}</span>
      <button onclick="clearFile()" style="color:var(--text-muted);cursor:pointer;background:none;border:none;line-height:0" title="Verwijderen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
  const titleInput = root.querySelector('#upload-title');
  if (titleInput && !titleInput.value) {
    titleInput.value = file.name.replace(/\.[^.]+$/, '');
  }
  const cat = root.querySelector('#upload-category')?.value;
  root.querySelector('#modal-submit-btn').disabled = !cat;
}

window.clearFile = function() {
  _selectedFile = null;
  const root = document.getElementById('modal-root');
  if (root) {
    root.querySelector('#selected-file-display').innerHTML = '';
    root.querySelector('#file-input').value = '';
    root.querySelector('#modal-submit-btn').disabled = true;
  }
};

function addTag(val, root) {
  if (!val || _tags.includes(val)) return;
  _tags.push(val);
  renderTags(root);
  root.querySelector('#tags-field').value = '';
}

function renderTags(root) {
  const chips = root.querySelector('#tags-chips');
  if (!chips) return;
  chips.innerHTML = _tags.map((t, i) => `
    <span class="tag-chip">
      ${escapeHtml(t)}
      <span class="tag-chip-remove" data-idx="${i}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>
    </span>
  `).join('');
  chips.querySelectorAll('.tag-chip-remove').forEach(el => {
    el.addEventListener('click', () => {
      _tags.splice(Number(el.dataset.idx), 1);
      renderTags(root);
    });
  });
}

async function doUpload(root) {
  if (!_selectedFile) return;
  const category = root.querySelector('#upload-category').value;
  if (!category) {
    root.querySelector('#upload-category').focus();
    return;
  }

  const title = root.querySelector('#upload-title').value.trim();
  const description = root.querySelector('#upload-description').value.trim();
  const submitBtn = root.querySelector('#modal-submit-btn');
  const progressContainer = root.querySelector('#upload-progress-container');
  const progressBar = root.querySelector('#progress-bar');
  const progressPct = root.querySelector('#upload-pct');

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="spinner spinner-sm"></div> Uploaden...`;
  progressContainer.style.display = 'block';

  const fd = new FormData();
  fd.append('file', _selectedFile);
  fd.append('category', category);
  if (title) fd.append('title', title);
  if (description) fd.append('description', description);
  fd.append('tags', _tags.join(','));

  try {
    const doc = await api.upload(fd, (pct) => {
      progressBar.style.width = `${pct}%`;
      progressPct.textContent = `${pct}%`;
    });
    closeUploadModal();
    window.App.toast('success', 'Geüpload', `"${doc.title}" is succesvol toegevoegd.`);
    if (_onSuccess) _onSuccess(doc);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Uploaden`;
    progressContainer.style.display = 'none';
    window.App.toast('error', 'Uploadfout', err.message);
  }
}
