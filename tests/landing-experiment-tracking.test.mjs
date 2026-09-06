import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const node=()=>({events:{},addEventListener(n,f){this.events[n]=f},focus(){}});
function page(variant,{preview=false,choice='allow'}={}){
 const els=Object.fromEntries(['consent','allow','deny','preferences','measurement-status'].map(k=>[k,node()]));
 els['sales-config']={dataset:{checkout:'https://pay.hotmart.com/T107441078P?checkoutMode=10',pixel:'2085840802138189',product:'8443694',lang:'es'}};
 const link=node(),proof=node(),detail=node(),offer=node(),scripts=[];let intersect;
 const store=new Map([['pr_ab_20260906_r3_session',JSON.stringify({variant,started:Date.parse('2026-09-06T16:00:00Z')})]]);
 const params=new URLSearchParams({utm_source:'FB',utm_campaign:'kit|120250216188090633',utm_medium:'es|120250252288060633',utm_content:'c2|120250252288070633',utm_term:'Instagram_Reels',meta_ad_id:'120250252288070633',sck:'120250252288070633',email:'buyer@example.com'});if(preview)params.set('preview','1');
 const window={location:new URL('https://example.com/vsl/es/'+variant.toLowerCase()+'3/?'+params),sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},localStorage:{getItem:()=>choice,setItem:(k,v)=>choice=v},addEventListener(){},IntersectionObserver:class{constructor(fn){intersect=fn}observe(){}disconnect(){}}};
 const document={currentScript:{src:'https://example.com/vsl/experiment-r3.js'},getElementById:k=>els[k],querySelector:s=>s==='.buy'?offer:null,querySelectorAll:s=>s==='a.co'?[link]:s==='.gallery a'?[proof]:s==='details'?[detail]:[],createElement:()=>({setAttribute(){}}),head:{appendChild:s=>scripts.push(s)}};
 for(const file of ['experiment-r3.js','attribution.js','sales.js'])vm.runInNewContext(fs.readFileSync(new URL('../vsl/'+file,import.meta.url),'utf8'),{window,document,URL,URLSearchParams});
 return {window,scripts,link,proof,detail,intersect,els};
}
for(const variant of ['A','B']){
 const p=page(variant);assert.equal(p.scripts.length,2);p.proof.events.click();p.detail.open=true;p.detail.events.toggle();p.intersect([{isIntersecting:true}]);p.link.events.click();
 p.link.events.click();
 const calls=Array.from(p.window.fbq.queue,a=>Array.from(a));
 for(const name of ['PageView','ViewContent','LandingExperimentExposureR3'+variant,'LandingExperimentCheckoutR3'+variant,'CheckoutClick','ProofOpen','DetailsOpen','OfferVisible']){const event=calls.find(c=>c[1]===name);assert(event,name);assert.equal(event[2].experiment_variant,variant);assert.equal(event[2].experiment_id,'pr_ab_20260906_r3')}
 assert.equal(calls.filter(c=>c[1]==='LandingExperimentCheckoutR3'+variant).length,1);
 assert(!calls.some(c=>['Purchase','InitiateCheckout','AddToCart'].includes(c[1])));
 const checkout=new URL(p.link.href);assert.equal(checkout.searchParams.get('sck'),'120250252288070633_ab0906r3'+variant);assert(checkout.searchParams.get('xcod').endsWith('hQwK21wXxRInstagram_Reels'));assert(!checkout.searchParams.has('email'));
 const denied=page(variant,{choice:'deny'});assert.equal(denied.scripts.length,0);assert.equal(new URL(denied.link.href).searchParams.get('sck'),'120250252288070633_ab0906r3'+variant);
 const preview=page(variant,{preview:true});assert.equal(preview.scripts.length,0);preview.link.events.click();assert(!preview.window.fbq);assert.equal(new URL(preview.link.href).searchParams.get('sck'),'preview_ab0906r3'+variant);
}
console.log('PASS: both arms carry identical diagnostic metadata, deduplicated exposure, canonical checkout/XCOD, consent gating, preview suppression and no Purchase/IC');
