(function () {
  'use strict';
  var experiment = window.PRExperiment;
  if (experiment && experiment.redirecting) return;
  var preview = experiment && experiment.preview;
  var config = document.getElementById('sales-config').dataset;
  var key = 'pr-sales-measurement-v3';
  var choice = null;
  var initialized = false;
  var localChoiceUnstored = false;
  var utmifyLoaded = false;
  var diagnosticsStarted = false;
  var dialog = document.getElementById('consent');
  var links = Array.from(document.querySelectorAll('a.co'));
  var params = new URLSearchParams(window.location.search);
  try { choice = window.localStorage.getItem(key); } catch (_) {}
  function checkout(link) {
    var url = new URL(config.checkout);
    var source=params;
    // On direct return visits the vendor may restore consented attribution to
    // the existing canonical checkout link. Validate that link before reuse.
    if(choice==='allow' && !params.get('utm_source') && link && link.href){
      try { var restored=new URL(link.href); if(restored.origin===url.origin && restored.pathname===url.pathname) source=restored.searchParams; } catch (_) {}
    }
    if (window.PRAttribution) window.PRAttribution.copy(source,url);
    var clickId = params.get('fbclid');
    if (!preview && choice === 'allow' && clickId && /^[A-Za-z0-9_-]{1,500}$/.test(clickId)) url.searchParams.set('fbclid',clickId);
    if (experiment && experiment.checkout) experiment.checkout(url);
    return url.href;
  }
  function updateLinks() { links.forEach(function (link) { link.href = checkout(link); }); }
  function start() {
    if (preview || choice !== 'allow') return;
    if (!utmifyLoaded) {
      var utmScript = document.createElement('script');
      utmScript.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js';
      utmScript.async = true; utmScript.defer = true;
      utmScript.setAttribute('data-utmify-prevent-subids','');
      // Keep canonical, validated attribution under our checkout bridge's control.
      utmScript.onload = updateLinks;
      document.head.appendChild(utmScript); utmifyLoaded = true;
    }
    if (!window.fbq) {
      var fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq,arguments) : fbq.queue.push(arguments); };
      fbq.queue=[]; fbq.push=fbq; fbq.loaded=true; fbq.version='2.0';
      window.fbq=fbq; window._fbq=fbq;
      var script=document.createElement('script'); script.async=true;
      script.src='https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    }
    window.fbq('consent','grant');
    if (initialized) return;
    window.fbq('init',config.pixel);
    var metadata = experiment && experiment.metadata ? experiment.metadata() : {};
    window.fbq('track','PageView',metadata);
    window.fbq('track','ViewContent',Object.assign({content_ids:[config.product],content_type:'product'},metadata));
    initialized=true;
    startDiagnostics();
    if(experiment && experiment.expose && experiment.expose()) diagnostic('LandingExperimentExposure' + experiment.variant);
  }
  function applyChoice(value, persist) {
    choice=value === 'allow' || value === 'deny' ? value : null;
    if (persist) {
      try { window.localStorage.setItem(key,choice); localChoiceUnstored=false; } catch (_) { localChoiceUnstored=true; }
    }
    if (choice !== 'allow' && window.fbq) window.fbq('consent','revoke');
    dialog.hidden=choice !== null; updateLinks(); start();
    document.getElementById('measurement-status').textContent=choice === null ? '' : config.lang === 'pt' ? (choice === 'allow' ? 'Medição opcional autorizada.' : 'Medição opcional desativada.') : (choice === 'allow' ? 'Medición opcional autorizada.' : 'Medición opcional desactivada.');
    // Reload also on cross-tab revocation to stop vendor listeners and timers.
    if (choice !== 'allow' && utmifyLoaded && window.location.reload) window.location.reload();
  }
  function choose(value) { applyChoice(value,true); }
  function diagnostic(name, extra) {
    syncChoice();
    if (preview || choice !== 'allow' || !window.fbq) return;
    window.fbq('trackCustom',name,Object.assign({content_ids:[config.product],funnel_version:'utmify-2026-09-06'},experiment && experiment.metadata ? experiment.metadata() : {},extra || {}));
  }
  function startDiagnostics() {
    if (diagnosticsStarted || !document.querySelector) return;
    diagnosticsStarted=true;
    document.querySelectorAll('.gallery a').forEach(function(link,index){
      link.addEventListener('click',function(){diagnostic('ProofOpen',{proof_id:'sample_'+(index+1)});});
    });
    document.querySelectorAll('details').forEach(function(detail,index){
      var recorded=false;
      detail.addEventListener('toggle',function(){if(detail.open && !recorded && choice==='allow'){recorded=true;diagnostic('DetailsOpen',{section_id:'details_'+(index+1)});}});
    });
    if (window.IntersectionObserver) {
      var offer=document.querySelector('.buy');
      if(offer){var observer=new window.IntersectionObserver(function(entries){
        if(entries.some(function(entry){return entry.isIntersecting;}) && choice==='allow'){diagnostic('OfferVisible');observer.disconnect();}
      },{threshold:0.25});observer.observe(offer);}
    }
  }
  function syncChoice() {
    // If storage is unavailable, keep only this page's known choice.
    // A missing/invalid stored preference is not consent.
    // Failed writes must not let stale storage override a choice made here.
    if (localChoiceUnstored) return;
    try {
      var saved=window.localStorage.getItem(key);
      var value=saved === 'allow' || saved === 'deny' ? saved : null;
      if (value !== choice) applyChoice(value,false);
    } catch (_) {}
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage',function(event){
      if (event.key !== key && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
      } catch (_) { return; }
      syncChoice();
    });
  }
  document.getElementById('allow').addEventListener('click',function(){choose('allow');});
  document.getElementById('deny').addEventListener('click',function(){choose('deny');});
  document.getElementById('preferences').addEventListener('click',function(){dialog.hidden=false;document.getElementById('deny').focus();});
  links.forEach(function(link){link.addEventListener('click',function(){
    // Recheck before tracking in case another tab revoked consent moments ago.
    syncChoice();
    updateLinks();
    // CheckoutClick is a diagnostic. Hotmart owns checkout-load and purchase events.
    diagnostic('CheckoutClick');
    if (!preview && choice === 'allow' && experiment && experiment.checkoutClick && experiment.checkoutClick()) diagnostic('LandingExperimentCheckout' + experiment.variant);
  });});
  dialog.hidden=choice === 'allow' || choice === 'deny';
  updateLinks(); start();
})();
