// Plays the product demo in the hero: 8 scenes, each a stack layer in the HTML.
// The script chooses the active scene and types the question; demo.css does the rest.
// Without this file, or with reduced motion, the page shows scene 4, the finished answer.
(function () {
  var root = document.querySelector('[data-demo]');
  var toggle = document.querySelector('[data-demo-toggle]');
  var caption = document.querySelector('[data-demo-caption]');
  var dots = Array.prototype.slice.call(document.querySelectorAll('[data-demo-dot]'));
  if (!root || !toggle || !caption || !dots.length) return;

  var scenes = Array.prototype.slice.call(root.querySelectorAll('[data-s]'));
  var typed = root.querySelector('[data-demo-typed]');
  var question = root.dataset.question;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var STILL = 4;
  var DURATION = { 1: 3000, 2: 3000, 3: 3000, 4: 4500, 5: 3500, 6: 4000, 7: 4500, 8: 3500 };

  var current = STILL;
  function show(number) {
    current = number;
    scenes.forEach(function (scene) { scene.classList.toggle('is-active', Number(scene.dataset.s) === number); });
    dots.forEach(function (dot, index) {
      if (index + 1 === number) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    caption.textContent = caption.dataset.template.replace('{n}', number) + dots[number - 1].dataset.label;
    root.dataset.scene = String(number);
  }

  // A pausable timer: on pause, keep how much of the current wait is left.
  var timer = null;
  var startedAt = 0;
  var remaining = 0;
  var running = false;
  var typedCount = 0;
  var characters = Array.from(question);

  function wait(ms, then) {
    remaining = ms;
    startedAt = performance.now();
    pendingStep = then;
    timer = setTimeout(function () {
      remaining = 0;
      pendingStep = null;
      then();
    }, ms);
  }
  var pendingStep = null;

  function typeNext() {
    if (typedCount < characters.length) {
      typedCount += 1;
      typed.textContent = characters.slice(0, typedCount).join('');
      wait(55, typeNext);
    } else {
      wait(700, nextScene);
    }
  }
  function nextScene() { enter(current % 8 + 1); }
  function enter(number) {
    show(number);
    typed.textContent = number === 3 ? '' : question;
    typedCount = 0;
    if (number === 3) wait(300, typeNext);
    else wait(DURATION[number], nextScene);
  }

  var pausedByUser = false;
  var onScreen = false;

  function sync() {
    var shouldRun = !pausedByUser && onScreen && !document.hidden && !reducedMotion.matches;
    if (shouldRun === running) return;
    running = shouldRun;
    root.toggleAttribute('data-paused', !shouldRun);
    // The caption announces only what the visitor asked for, not every automatic step.
    caption.setAttribute('aria-live', shouldRun ? 'off' : 'polite');
    if (shouldRun) {
      if (pendingStep) wait(remaining, pendingStep);
      else enter(1);
    } else {
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    }
  }

  function renderToggle() {
    toggle.textContent = pausedByUser ? toggle.dataset.resume : toggle.dataset.pause;
  }

  // Dots jump to a scene and stay there, so the visitor can read it.
  function jump(number, focus) {
    pausedByUser = true;
    renderToggle();
    clearTimeout(timer);
    pendingStep = null;
    running = false;
    root.setAttribute('data-paused', '');
    caption.setAttribute('aria-live', 'polite');
    typed.textContent = question;
    show(number);
    if (focus) dots[number - 1].focus();
  }
  dots.forEach(function (dot, index) {
    dot.addEventListener('click', function () { jump(index + 1); });
    dot.addEventListener('keydown', function (event) {
      var delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (delta) {
        event.preventDefault();
        jump((index + delta + dots.length) % dots.length + 1, true);
      }
    });
  });

  toggle.addEventListener('click', function () {
    pausedByUser = !pausedByUser;
    renderToggle();
    sync();
  });
  document.addEventListener('visibilitychange', sync);

  function applyMotionPreference() {
    toggle.hidden = reducedMotion.matches;
    if (reducedMotion.matches) {
      sync();
      pendingStep = null;
      remaining = 0;
      typed.textContent = question;
      show(STILL);
    } else {
      sync();
    }
  }
  reducedMotion.addEventListener('change', applyMotionPreference);

  // The observer reports only after the first paint, so measure now to avoid a flash.
  var box = root.getBoundingClientRect();
  onScreen = box.top < window.innerHeight && box.bottom > 0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    }, { threshold: 0.25 }).observe(root);
  } else {
    onScreen = true;
  }

  dots.forEach(function (dot) { dot.hidden = false; });
  renderToggle();
  applyMotionPreference();
})();
