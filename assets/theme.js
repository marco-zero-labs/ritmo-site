// Runs in <head>, before the first paint. Keeps two preferences for this browser only:
// the theme (light, dark or system) and the platform shown in the phone previews.
// The page works without this file: light theme and iOS previews. device.js runs first.
(function () {
  var root = document.documentElement;
  var query = window.matchMedia('(prefers-color-scheme: dark)');
  var THEME_KEY = 'ritmo-theme';
  var PLATFORM_KEY = 'ritmo-platform';

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function themePreference() {
    var saved = read(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  }
  // The system only picks the starting platform: the same one on iOS and iPadOS, and
  // Android everywhere else. Nothing is sent.
  function platformPreference() {
    var saved = read(PLATFORM_KEY);
    if (saved === 'ios' || saved === 'android') return saved;
    return root.dataset.os === 'ios' || root.dataset.os === 'ipados' ? 'ios' : 'android';
  }
  function resolvedTheme() {
    var preference = themePreference();
    return preference === 'system' ? (query.matches ? 'dark' : 'light') : preference;
  }

  // Images pick their dark version with <source media>. Point those sources at the
  // chosen theme so they switch together with the page.
  function syncPictures(theme) {
    var sources = document.querySelectorAll('picture source[data-theme-source]');
    for (var i = 0; i < sources.length; i++) sources[i].media = theme === 'dark' ? 'all' : 'not all';
  }
  function syncDevices() {
    var platform = platformPreference();
    var devices = document.querySelectorAll('[data-device]');
    for (var i = 0; i < devices.length; i++) {
      devices[i].classList.toggle('device--ios', platform === 'ios');
      devices[i].classList.toggle('device--android', platform === 'android');
    }
  }
  function syncControls() {
    var values = { theme: themePreference(), platform: platformPreference() };
    var inputs = document.querySelectorAll('input[data-pref]');
    for (var i = 0; i < inputs.length; i++) inputs[i].checked = inputs[i].value === values[inputs[i].dataset.pref];
    var buttons = document.querySelectorAll('button[data-pref-button]');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-pressed', String(buttons[j].dataset.value === values[buttons[j].dataset.prefButton]));
    }
  }
  function apply() {
    var theme = resolvedTheme();
    root.dataset.theme = theme;
    root.dataset.platform = platformPreference();
    syncPictures(theme);
    syncDevices();
    syncControls();
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].removeAttribute('media');
    if (metas.length) metas[0].content = theme === 'dark' ? '#1b1b19' : '#ffffff';
  }

  window.RitmoPrefs = {
    set: function (name, value) {
      write(name === 'theme' ? THEME_KEY : PLATFORM_KEY, value);
      apply();
    },
    apply: apply,
  };

  root.classList.add('js');
  apply();
  query.addEventListener('change', apply);

  document.addEventListener('DOMContentLoaded', function () {
    var sources = document.querySelectorAll('picture source[media*="prefers-color-scheme: dark"]');
    for (var i = 0; i < sources.length; i++) sources[i].setAttribute('data-theme-source', '');
    apply();
  });
})();
