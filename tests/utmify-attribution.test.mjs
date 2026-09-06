import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};
vm.runInNewContext(fs.readFileSync(new URL('../vsl/attribution.js',import.meta.url),'utf8'),{window,URL,URLSearchParams});
const params=new URLSearchParams({utm_source:'FB',utm_campaign:'PR-LATAM | KIT500 | VSL | CBO | K1|120250216188090633',utm_medium:'KIT ES | MX+CO+CL | PURCHASE | REVISAO | PAUSADO|120250252288060633',utm_content:'AD | C2-ES | teste10min | K1|120250252288070633',utm_term:'Instagram_Reels',meta_ad_id:'120250252288070633',email:'buyer@example.com',phone:'555123456',child_age:'4',xcod:'untrusted',sck:'120250252288070633'});
const first=window.PRAttribution.copy(params,new URL('https://pay.hotmart.com/T107441078P?checkoutMode=10'));
assert.equal(first.searchParams.get('checkoutMode'),'10');
assert.equal(first.searchParams.get('xcod'),['utm_source','utm_campaign','utm_medium','utm_content','utm_term'].map(k=>params.get(k)).join('hQwK21wXxR'));
for(const k of ['email','phone','child_age'])assert(!first.searchParams.has(k));
const returnUrl=window.PRAttribution.copy(first.searchParams,new URL('https://example.com/vsl/es/'));
const checkoutAgain=window.PRAttribution.copy(returnUrl.searchParams,new URL('https://pay.hotmart.com/T107441078P?checkoutMode=10'));
assert.equal(checkoutAgain.href,first.href,'policy round trip preserves exact attribution');
for(const bad of ['buyer@example.com','<script>','javascript:evil','{{ad.name}}|{{ad.id}}','line\nbreak','a'.repeat(201)]){
 const unsafe=new URLSearchParams(params);unsafe.set('utm_campaign',bad);
 const url=window.PRAttribution.copy(unsafe,new URL('https://pay.hotmart.com/T107441078P'));
 assert(!url.searchParams.has('utm_campaign'));assert(!url.searchParams.has('xcod'));
}
const legacy=window.PRAttribution.copy(new URLSearchParams('utm_source=facebook&utm_medium=paid_social&utm_campaign=120250216188090633&utm_content=120250252288070633&sck=120250252288070633'),new URL('https://pay.hotmart.com/T107441078P'));
assert.equal(legacy.searchParams.get('sck'),'120250252288070633');assert(!legacy.searchParams.has('xcod'));
console.log('PASS: native UTMify Hotmart XCOD, campaign IDs, privacy roundtrip, PII/unresolved macro rejection and legacy compatibility');
