(function () {
  'use strict';
  var names = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','mcid','masid','maid','meta_campaign_id','meta_adset_id','meta_ad_id','sck','src'];
  function safe(value) {
    return typeof value === 'string' && value.length <= 200 && /^[\p{L}\p{N} _.,|+()$–—-]+$/u.test(value);
  }
  function copy(params, target) {
    names.forEach(function (name) {
      var value = params.get(name);
      if (safe(value)) target.searchParams.set(name, name === 'sck' ? value.slice(0,50) : value);
    });
    // Hotmart sends XCOD in its purchase webhook. Rebuild only from validated
    // campaign fields, never from arbitrary incoming XCOD or contact data.
    var fields = ['utm_source','utm_campaign','utm_medium','utm_content','utm_term'].map(function(name){return target.searchParams.get(name);});
    if (fields.every(safe) && /^(FB|IG|facebook|instagram|meta)$/i.test(fields[0]) && fields.slice(1,4).every(function(v){return /\|[0-9]{5,25}$/.test(v);})) {
      target.searchParams.set('xcod',fields.join('hQwK21wXxR'));
    }
    return target;
  }
  window.PRAttribution = {copy:copy};
})();
