(function () {
  'use strict';
  var ENABLED = true;
  var ID = 'pr_ab_20260906_r3';
  var END = Date.parse('2026-09-07T04:04:00Z');
  var AD = '120250252288070633';
  var CAMPAIGN = '120250216188090633';
  var KEY = ID + '_session';
  var base = new URL('./es/', document.currentScript.src);
  var url = new URL(window.location.href);
  var route = url.pathname.replace(/index\.html$/, '');
  var page = route === base.pathname + 'a3/' ? 'A' : route === base.pathname + 'b3/' ? 'B' : null;
  var preview = url.searchParams.get('preview') === '1';
  var state = null;
  var experiment = {id: ID, variant: page, eventSuffix: 'R3', enrolled: false, preview: preview, redirecting: false};
  window.PRExperiment = experiment;
  function read() {
    try {
      var value = JSON.parse(window.sessionStorage.getItem(KEY));
      if (value && /^(A|B)$/.test(value.variant) && Number.isFinite(value.started) && value.started < END) return value;
    } catch (_) {}
    return null;
  }
  function matches(name, id, fallback) {
    return url.searchParams.get(name) === id || (url.searchParams.get(fallback) || '').endsWith('|' + id);
  }
  state = read();
  if (!preview && ENABLED && Date.now() < END && route === base.pathname &&
      matches('meta_ad_id', AD, 'utm_content') && matches('meta_campaign_id', CAMPAIGN, 'utm_campaign')) {
    if (!state) {
      state = {variant: Math.random() < 0.5 ? 'A' : 'B', started: Date.now()};
      try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); }
      catch (_) { return; } // No stable assignment: keep the control, outside the experiment.
    }
    var target = new URL(state.variant.toLowerCase() + '3/', base);
    target.search = url.search;
    target.hash = url.hash;
    experiment.redirecting = true;
    window.location.replace(target.href);
    return;
  }
  // A previously assigned page stays attributed even if payment completes after the pilot ends.
  experiment.enrolled = !preview && !!page && !!state && state.variant === page;
  experiment.metadata = function () {
    return experiment.enrolled ? {experiment_id: ID, experiment_variant: page} : {};
  };
  experiment.expose = function () {
    if (!experiment.enrolled) return false;
    try {
      if (window.sessionStorage.getItem(ID + '_exposed') === page) return false;
      window.sessionStorage.setItem(ID + '_exposed', page);
      return true;
    } catch (_) { return false; }
  };
  experiment.checkoutClick = function () {
    if (!experiment.enrolled) return false;
    try {
      if (window.sessionStorage.getItem(ID + '_checkout') === page) return false;
      window.sessionStorage.setItem(ID + '_checkout', page);
      return true;
    } catch (_) { return false; }
  };
  experiment.checkout = function (target) {
    if (preview) target.searchParams.set('sck', 'preview_ab0906r3' + (page || 'A'));
    else if (experiment.enrolled) target.searchParams.set('sck', AD + '_ab0906r3' + page);
    else if (page) target.searchParams.set('sck', 'direct_ab0906r3' + page);
    return target;
  };
})();
