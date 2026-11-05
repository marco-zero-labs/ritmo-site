// Runs in <head>, before theme.js and before the first paint, so the frames do not flash.
// Sets data-os and data-form on <html>. Only the look of the frames depends on this: if the
// guess is wrong, the visitor sees another frame and can change it. Nothing is stored or sent.
(function () {
  var root = document.documentElement;
  var hints = navigator.userAgentData;
  var ua = navigator.userAgent || '';
  var source = (hints && hints.platform) || ua;

  function detectOs() {
    // Order matters: Android user agents contain "Linux", iPhone ones contain "Mac OS X".
    if (/android/i.test(source)) return 'android';
    if (/iphone|ipod|^ios$/i.test(source)) return 'ios';
    if (/ipad/i.test(source)) return 'ipados';
    // iPadOS Safari reports itself as a Mac. Macs have no multi-touch screen, iPads do.
    if (/mac/i.test(source)) return navigator.maxTouchPoints > 1 ? 'ipados' : 'macos';
    if (/windows/i.test(source)) return 'windows';
    if (/cros|chrome os/i.test(source)) return 'other';
    if (/linux|x11/i.test(source)) return 'linux';
    return 'other';
  }

  function detectForm(os) {
    if (os === 'ios') return 'phone';
    if (os === 'ipados') return 'tablet';
    if (os !== 'android') return 'desktop';
    if (hints && typeof hints.mobile === 'boolean') return hints.mobile ? 'phone' : 'tablet';
    // Android tablets leave "Mobile" out of the user agent.
    return /mobile/i.test(ua) ? 'phone' : 'tablet';
  }

  var os = detectOs();
  root.dataset.os = os;
  root.dataset.form = detectForm(os);
})();
