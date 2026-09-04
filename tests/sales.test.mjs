import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../vsl/sales.js',import.meta.url),'utf8');
function runtime(saved=null,blocked=false){
  const elements={};
  for(const id of ['consent','allow','deny','preferences','measurement-status']) elements[id]={hidden:true,events:{},addEventListener(n,f){this.events[n]=f;},focus(){}};
  const links=[{href:'https://pay.hotmart.com/T107442451G?checkoutMode=10',events:{},addEventListener(n,f){this.events[n]=f;}}];
  elements['sales-config']={dataset:{checkout:links[0].href,pixel:'2085840802138189',product:'8444319',lang:'pt'}};
  const scripts=[];
  const window={location:{search:'?utm_source=meta&utm_campaign=pr-k2&sck=ad123&fbclid=test-click&email=a%40b.com&child_age=4&off=bad'},localStorage:{getItem(){if(blocked)throw Error();return saved},setItem(_,v){if(blocked)throw Error();saved=v}}};
  const document={getElementById:id=>elements[id],querySelectorAll:()=>links,createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
  vm.runInNewContext(source,{window,document,URL,URLSearchParams});
  return{window,elements,links,scripts,calls:()=>Array.from(window.fbq?.queue??[],a=>Array.from(a))};
}
for(const blocked of [false,true]){
  const r=runtime(null,blocked);
  assert.equal(r.scripts.length,0);
  assert.equal(r.elements.consent.hidden,false);
  let u=new URL(r.links[0].href);
  assert.equal(u.searchParams.get('sck'),'ad123');
  assert.equal(u.searchParams.get('checkoutMode'),'10');
  for(const p of ['fbclid','email','child_age','off']) assert.equal(u.searchParams.has(p),false);
  r.elements.allow.events.click();
  assert.equal(r.scripts.length,1);
  assert.equal(new URL(r.links[0].href).searchParams.get('fbclid'),'test-click');
  r.elements.allow.events.click();
  assert.equal(r.calls().filter(c=>c[1]==='PageView').length,1);
  r.links[0].events.click();
  assert.equal(r.calls().filter(c=>c[1]==='CheckoutClick').length,1);
  r.elements.deny.events.click();
  assert(r.calls().some(c=>c[0]==='consent'&&c[1]==='revoke'));
  const n=r.calls().length;
  r.links[0].events.click();
  assert.equal(r.calls().length,n);
  assert.equal(new URL(r.links[0].href).searchParams.has('fbclid'),false);
  assert(!r.calls().some(c=>['Purchase','InitiateCheckout'].includes(c[1])));
}
assert.equal(runtime('deny').scripts.length,0);
assert.equal(runtime('allow').scripts.length,1);
for(const lang of ['pt','es']){
  const html=fs.readFileSync(new URL(`../vsl/${lang}/index.html`,import.meta.url),'utf8');
  assert(!/href="#"|deadline|12 meses|2 minutos|<video|SEUNUMERO/.test(html));
  const code=lang==='pt'?'T107442451G':'T107441078P';
  const ctas=[...html.matchAll(/class="(?:btn )?co" href="([^"]+)"/g)];
  assert(ctas.length>=2);
  for(const [,url] of ctas) assert.equal(new URL(url).pathname,'/'+code);
  for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^(https?:|mailto:|#)/.test(url))continue;
    assert(fs.existsSync(new URL(url,new URL(`../vsl/${lang}/index.html`,import.meta.url))),`missing ${url}`);
  }
}
console.log('PASS: consent, revocation, storage failure, attribution, real checkout fallback, purchase ownership and asset links.');
