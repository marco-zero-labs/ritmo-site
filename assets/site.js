// Interactions for the phone preview and the calculator. Without this file the page
// still shows the iOS preview on the Ask screen, and all the text.
(function () {
  // Theme: native radio buttons, so arrow keys already work. Platform: toggle buttons.
  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('button[data-pref-button]');
    if (button) window.RitmoPrefs.set(button.dataset.prefButton, button.dataset.value);
  });

  // Device section: one soft entrance, the first time it appears. CSS skips it for reduced motion.
  var reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (element) {
      element.classList.add('reveal');
      revealObserver.observe(element);
    });
  }

  document.addEventListener('change', function (event) {
    var input = event.target;
    if (input.matches && input.matches('input[data-pref]') && input.checked) {
      window.RitmoPrefs.set(input.dataset.pref, input.value);
    }
  });

  var preview = document.querySelector('[data-preview]');
  if (preview) {
    var tabs = Array.prototype.slice.call(preview.querySelectorAll('[role="tab"]'));
    var views = preview.querySelectorAll('[data-screen]');
    var chipsBox = preview.querySelector('[data-chips]');
    var chips = Array.prototype.slice.call(preview.querySelectorAll('[data-ask-chip]'));
    var convos = preview.querySelectorAll('[data-ask]');

    var showScreen = function (name, focus) {
      tabs.forEach(function (tab) {
        var on = tab.dataset.tab === name;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        if (on && focus) tab.focus();
      });
      for (var i = 0; i < views.length; i++) views[i].hidden = views[i].dataset.screen !== name;
      chipsBox.hidden = name !== 'ask';
    };
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { showScreen(tab.dataset.tab); });
      tab.addEventListener('keydown', function (event) {
        var delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        var next = null;
        if (delta) next = tabs[(index + delta + tabs.length) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          event.preventDefault();
          showScreen(next.dataset.tab, true);
        }
      });
    });
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (other) { other.setAttribute('aria-pressed', other === chip ? 'true' : 'false'); });
        for (var i = 0; i < convos.length; i++) convos[i].hidden = convos[i].dataset.ask !== chip.dataset.askChip;
      });
    });

    // Sign out is only a sample of each platform's confirmation.
    var confirmBox = preview.querySelector('[data-confirm]');
    var toast = preview.querySelector('[data-toast]');
    var signOut = preview.querySelector('[data-signout]');
    var toastTimer;
    signOut.addEventListener('click', function () {
      confirmBox.hidden = false;
      confirmBox.querySelector('button').focus();
    });
    Array.prototype.forEach.call(confirmBox.querySelectorAll('button'), function (button) {
      button.addEventListener('click', function () {
        confirmBox.hidden = true;
        signOut.focus();
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.hidden = true; }, 4000);
      });
    });
    confirmBox.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        confirmBox.hidden = true;
        signOut.focus();
      }
    });
  }

  // Calculator: runs only in this browser and sends nothing.
  var form = document.querySelector('[data-calc]');
  if (form) {
    var output = form.querySelector('output');
    var share = form.querySelector('[data-calc-share]');
    var number = function (name) {
      var value = Number(form.elements[name].value);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    };
    var update = function () {
      var active = number('active');
      var ticket = number('ticket');
      var stopped = number('stopped');
      // The currency is always the company's; only the number format follows the language.
      var amount = new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 0 });
      if (stopped > active) {
        output.textContent = '—';
        share.textContent = form.dataset.tooMany;
        return;
      }
      output.textContent = 'R$\u00a0' + amount.format(stopped * ticket);
      var percent = active > 0 ? Math.round((stopped / active) * 100) : 0;
      share.textContent = form.dataset.share.replace('{percent}', percent);
    };
    form.addEventListener('input', update);
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    update();
  }
})();
