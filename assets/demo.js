// Plays the product demo in the hero. The script only sets data-scene and types
// the question; every visual change lives in demo.css. Without this file, or with
// reduced motion, the page shows the finished answer (scene 3) from the HTML.
(function () {
  var root = document.querySelector('[data-demo]');
  var toggle = document.querySelector('[data-demo-toggle]');
  if (!root || !toggle) return;

  var typed = root.querySelector('[data-demo-typed]');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The whole loop as a flat list: do something, then wait this long.
  var steps = [];
  function add(run, wait) { steps.push({ run: run, wait: wait }); }
  function show(scene) { return function () { root.dataset.scene = scene; }; }

  add(function () {
    typed.textContent = '';
    root.dataset.scene = '1';
    root.dataset.veil = 'off';
  }, 700);
  Array.from(root.dataset.question).forEach(function (character) {
    add(function () { typed.textContent += character; }, 55);
  });
  add(function () {}, 500);
  add(function () { typed.textContent = ''; root.dataset.scene = '2'; }, 1400);
  add(show('3'), 3600);
  add(show('4'), 3600);
  add(show('5'), 3000);
  add(show('6'), 5000);
  add(function () { root.dataset.veil = 'on'; }, 400);

  // A pausable timer: on pause, keep how much of the current wait is left.
  var index = 0;
  var timer = null;
  var startedAt = 0;
  var remaining = 0;
  var running = false;

  function wait(ms) {
    remaining = ms;
    startedAt = performance.now();
    timer = setTimeout(function () {
      remaining = 0;
      next();
    }, ms);
  }
  function next() {
    var step = steps[index];
    index = (index + 1) % steps.length;
    step.run();
    wait(step.wait);
  }

  // Three independent reasons to stop. It plays only when none of them applies.
  var pausedByUser = false;
  var onScreen = false;

  function sync() {
    var shouldRun = !pausedByUser && onScreen && !document.hidden && !reducedMotion.matches;
    if (shouldRun === running) return;
    running = shouldRun;
    root.toggleAttribute('data-paused', !shouldRun);
    if (shouldRun) {
      if (remaining > 0) wait(remaining);
      else next();
    } else {
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    }
  }

  function renderToggle() {
    toggle.textContent = pausedByUser ? toggle.dataset.resume : toggle.dataset.pause;
    toggle.setAttribute('aria-pressed', pausedByUser ? 'true' : 'false');
  }

  // With reduced motion there is nothing to pause, so the button goes away and the
  // demo returns to the finished answer. Turning the setting off starts it again.
  function applyMotionPreference() {
    toggle.hidden = reducedMotion.matches;
    if (reducedMotion.matches) {
      sync();
      index = 0;
      remaining = 0;
      typed.textContent = '';
      root.dataset.scene = '3';
      root.dataset.veil = 'off';
    } else {
      sync();
    }
  }

  toggle.addEventListener('click', function () {
    pausedByUser = !pausedByUser;
    renderToggle();
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', applyMotionPreference);

  // The observer only reports after the first paint, which would flash the finished
  // answer. Measuring now lets the first frame already show the start of the loop.
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

  renderToggle();
  applyMotionPreference();
})();
