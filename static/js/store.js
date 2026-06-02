/* Simple reactive store using EventTarget */
const store = new EventTarget();

let _state = {
  stats: null,
  categories: [],
  currentCategory: null,
  documents: [],
  currentDocument: null,
  searchResults: null,
  loading: false,
  route: '/',
};

export function getState() { return { ..._state }; }

export function setState(patch) {
  _state = { ..._state, ...patch };
  store.dispatchEvent(new CustomEvent('change', { detail: _state }));
}

export function subscribe(fn) {
  store.addEventListener('change', (e) => fn(e.detail));
  return () => store.removeEventListener('change', fn);
}
