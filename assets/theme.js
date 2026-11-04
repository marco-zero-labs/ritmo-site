// tokens.css themes by data-theme, so follow the system preference with it.
(function () {
  var query = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    document.documentElement.dataset.theme = query.matches ? 'dark' : 'light';
  }
  apply();
  query.addEventListener('change', apply);
})();
