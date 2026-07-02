(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('hoofdnav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  document.querySelectorAll('form[data-bevestig]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-bevestig'))) {
        e.preventDefault();
      }
    });
  });
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js').catch(function (err) {
      console.warn('Service worker registratie mislukt:', err);
    });
  });
}
