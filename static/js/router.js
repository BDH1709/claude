const routes = new Map();
let _currentPath = null;

export function route(pattern, handler) {
  routes.set(pattern, handler);
}

export function navigate(path) {
  window.location.hash = path === '/' ? '' : path;
}

export function getCurrentPath() { return _currentPath; }

function parsePath() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash;
}

function matchRoute(path) {
  for (const [pattern, handler] of routes) {
    if (pattern === path) return { handler, params: {} };
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) continue;
    const params = {};
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        match = false; break;
      }
    }
    if (match) return { handler, params };
  }
  return null;
}

export function startRouter() {
  const dispatch = () => {
    const path = parsePath();
    _currentPath = path;
    const matched = matchRoute(path);
    if (matched) {
      matched.handler(matched.params);
    } else {
      navigate('/');
    }
  };
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
