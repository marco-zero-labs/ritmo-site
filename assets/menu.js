// The phone menu works without this. It only closes the menu after a choice or on Esc.
(function () {
  var menu = document.querySelector('.menu');
  if (!menu) return;
  menu.addEventListener('click', function (event) {
    if (event.target.closest('a')) menu.open = false;
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
})();
