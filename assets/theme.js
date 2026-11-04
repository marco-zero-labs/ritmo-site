// tokens.css themes by data-theme. The page follows the system preference
// until the visitor picks a theme with the header button; that choice is kept
// in this browser only (localStorage), and the page works the same without it.
(function () {
  var root = document.documentElement;
  var query = window.matchMedia('(prefers-color-scheme: dark)');
  var KEY = 'ritmo-theme';

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function current() {
    var s = saved();
    return s === 'dark' || s === 'light' ? s : (query.matches ? 'dark' : 'light');
  }
  // Product screenshots pick their dark version with <source media>. Point those
  // sources at the chosen theme so the screens switch together with the page.
  function syncPictures(theme) {
    var sources = document.querySelectorAll('picture source[data-theme-source]');
    for (var i = 0; i < sources.length; i++) {
      sources[i].media = theme === 'dark' ? 'all' : 'not all';
    }
  }
  function apply() {
    var theme = current();
    root.dataset.theme = theme;
    syncPictures(theme);
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  apply();
  query.addEventListener('change', apply);

  document.addEventListener('DOMContentLoaded', function () {
    var sources = document.querySelectorAll('picture source[media*="prefers-color-scheme: dark"]');
    for (var i = 0; i < sources.length; i++) sources[i].setAttribute('data-theme-source', '');
    apply();
    document.addEventListener('click', function (event) {
      var button = event.target.closest('.theme-toggle');
      if (!button) return;
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) {}
      apply();
    });
  });
})();
