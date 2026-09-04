(function () {
  'use strict';
  var config = document.getElementById('sales-config').dataset;
  var key = 'pr-sales-measurement-v2';
  var choice = null;
  var initialized = false;
  var dialog = document.getElementById('consent');
  var links = Array.from(document.querySelectorAll('a.co'));
  var params = new URLSearchParams(window.location.search);
  var allowed = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','mcid','masid','maid','sck','src'];
  try { choice = window.localStorage.getItem(key); } catch (_) {}
  function checkout() {
    var url = new URL(config.checkout);
    allowed.forEach(function (name) {
      var value = params.get(name);
      // Campaign identifiers only: never forward contact details or quiz answers.
      if (value && /^[A-Za-z0-9_. -]{1,150}$/.test(value)) url.searchParams.set(name, name === 'sck' ? value.slice(0,50) : value);
    });
    var clickId = params.get('fbclid');
    if (choice === 'allow' && clickId && /^[A-Za-z0-9_-]{1,500}$/.test(clickId)) url.searchParams.set('fbclid',clickId);
    return url.href;
  }
  function updateLinks() { links.forEach(function (link) { link.href = checkout(); }); }
  function start() {
    if (choice !== 'allow') return;
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
    window.fbq('track','PageView');
    window.fbq('track','ViewContent',{content_ids:[config.product],content_type:'product'});
    initialized=true;
  }
  function choose(value) {
    choice=value;
    try { window.localStorage.setItem(key,value); } catch (_) {}
    if (value === 'deny' && window.fbq) window.fbq('consent','revoke');
    dialog.hidden=true; updateLinks(); start();
    document.getElementById('measurement-status').textContent=config.lang === 'pt' ? (value === 'allow' ? 'Medição opcional autorizada.' : 'Medição opcional desativada.') : (value === 'allow' ? 'Medición opcional autorizada.' : 'Medición opcional desactivada.');
  }
  document.getElementById('allow').addEventListener('click',function(){choose('allow');});
  document.getElementById('deny').addEventListener('click',function(){choose('deny');});
  document.getElementById('preferences').addEventListener('click',function(){dialog.hidden=false;document.getElementById('deny').focus();});
  links.forEach(function(link){link.addEventListener('click',function(){
    // CheckoutClick is a diagnostic. Hotmart owns checkout-load and purchase events.
    if(choice === 'allow' && window.fbq) window.fbq('trackCustom','CheckoutClick',{content_ids:[config.product]});
  });});
  dialog.hidden=choice === 'allow' || choice === 'deny';
  updateLinks(); start();
})();
