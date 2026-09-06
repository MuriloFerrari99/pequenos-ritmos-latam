(function () {
  'use strict';
  // Routes are relative to this script's directory, including on a local preview.
  var base = new URL('./', document.currentScript.src);
  var routes = ['pt/', 'es/', 'es/a/', 'es/b/', 'es/a2/', 'es/b2/', 'es/mx/', 'es/co/', 'es/cl/', 'es/pe/', 'es/ar/'];
  var params = new URLSearchParams(window.location.search);
  function copyCampaign(target) {
    if (window.PRAttribution) window.PRAttribution.copy(params,target);
    if (params.get('preview') === '1') target.searchParams.set('preview','1');
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
