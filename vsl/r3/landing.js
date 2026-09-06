(function () {
  'use strict';
  var dialog = document.getElementById('sample-dialog');
  var dialogImage = document.getElementById('dialog-image');
  var title = document.getElementById('sample-title');
  var sticky = document.getElementById('sticky-buy');
  var consent = document.getElementById('consent');
  var hero = document.querySelector('.hero-action');
  var offer = document.querySelector('.offer-card');
  var last = document.querySelector('.last-cta');
  function updateSticky() {
    if (!sticky || !hero) return;
    function visible(element) {
      if (!element) return false;
      var rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }
    sticky.hidden = hero.getBoundingClientRect().bottom > 0 || visible(offer) || visible(last) ||
      !!(consent && !consent.hidden) || !!(dialog && dialog.open);
  }
  document.querySelectorAll('[data-sample]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!dialog || typeof dialog.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      var name = link.closest('article').querySelector('h3').textContent;
      title.textContent = name + ': una página real';
      dialogImage.src = link.href;
      dialogImage.alt = 'Página real de ' + name + ', incluida en el kit en español';
      dialog.showModal();
      updateSticky();
    });
  });
  if (dialog) {
    document.getElementById('close-sample').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('close', updateSticky);
  }
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(updateSticky);
    [hero, offer, last].forEach(function (element) { if (element) observer.observe(element); });
  } else window.addEventListener('scroll', updateSticky, {passive: true});
  window.addEventListener('resize', updateSticky, {passive: true});
  if (consent) new MutationObserver(updateSticky).observe(consent, {attributes: true, attributeFilter: ['hidden']});
  updateSticky();
})();
