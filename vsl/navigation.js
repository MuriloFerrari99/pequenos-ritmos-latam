(function () {
  'use strict';
  // Routes are relative to this script's directory, including on a local preview.
  var base = new URL('./', document.currentScript.src);
  var routes = ['pt/', 'es/', 'es/mx/', 'es/co/', 'es/cl/', 'es/pe/', 'es/ar/'];
  var allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'mcid', 'masid', 'maid', 'sck', 'src'];
  var params = new URLSearchParams(window.location.search);
  function copyCampaign(target) {
    allowed.forEach(function (name) {
      var value = params.get(name);
      if (value && /^[A-Za-z0-9_. -]{1,150}$/.test(value)) {
        target.searchParams.set(name, name === 'sck' ? value.slice(0, 50) : value);
      }
    });
  }
  var route = routes.find(function (candidate) {
    var path = new URL(candidate, base).pathname;
    return window.location.pathname === path || window.location.pathname === path + 'index.html';
  });
  if (route) {
    document.querySelectorAll('a[data-policy-link]').forEach(function (link) {
      var target = new URL(link.getAttribute('href'), window.location.href);
      target.search = '';
      target.searchParams.set('return_to', route);
      copyCampaign(target);
      link.href = target.href;
    });
  }
  var returnTo = params.get('return_to');
  if (routes.indexOf(returnTo) !== -1) {
    var target = new URL(returnTo, base);
    copyCampaign(target);
    document.querySelectorAll('a[data-policy-return]').forEach(function (link) {
      link.href = target.href;
    });
  }
})();
