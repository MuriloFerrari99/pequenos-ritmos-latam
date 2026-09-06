import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../vsl/experiment-r3.js',import.meta.url),'utf8');
const end=Date.parse('2026-09-07T04:04:00Z');
const campaign=new URLSearchParams({meta_ad_id:'120250252288070633',meta_campaign_id:'120250216188090633',utm_source:'FB',utm_campaign:'kit|120250216188090633',utm_medium:'es|120250252288060633',utm_content:'c2|120250252288070633',utm_term:'Instagram_Reels',sck:'120250252288070633'});
const base='https://example.com/pequenos-ritmos-latam/vsl/';
function run(path,{store=new Map(),random=0.2,now=end-1000,unavailable=false}={}){
 let redirected;
 const url=new URL(path,base);
 const window={location:{href:url.href,replace(v){redirected=v}},sessionStorage:{getItem(k){if(unavailable)throw Error('blocked');return store.get(k)||null},setItem(k,v){if(unavailable)throw Error('blocked');store.set(k,v)}}};
 const document={currentScript:{src:base+'experiment.js'}};
 vm.runInNewContext(source,{window,document,URL,Date:{parse:Date.parse,now:()=>now},Math:{random:()=>random}});
 return {exp:window.PRExperiment,redirected,store};
}
for(const [random,variant] of [[0,'A'],[0.49999,'A'],[0.5,'B'],[0.9999,'B']]){
 const first=run('es/?'+campaign,{random});assert.equal(new URL(first.redirected).pathname,new URL('es/'+variant.toLowerCase()+'3/',base).pathname);
 assert.equal(new URL(first.redirected).searchParams.toString(),campaign.toString());
 const repeat=run('es/?'+campaign,{store:first.store,random:1-random});assert.equal(repeat.redirected,first.redirected,'session remains in assigned arm');
 const landing=run(first.redirected,{store:first.store});assert(landing.exp.enrolled);assert.equal(landing.exp.metadata().experiment_variant,variant);
 assert(landing.exp.expose());assert(!landing.exp.expose());assert(!run(first.redirected,{store:first.store}).exp.expose(),'reload does not inflate exposure');
 const checkout=landing.exp.checkout(new URL('https://pay.hotmart.com/T107441078P?'+campaign));assert.equal(checkout.searchParams.get('sck'),'120250252288070633_ab0906r3'+variant);
 assert.equal(checkout.searchParams.get('utm_content'),campaign.get('utm_content'));assert.equal(checkout.searchParams.get('meta_ad_id'),campaign.get('meta_ad_id'));
 assert.equal(run('es/?'+campaign,{store:first.store,now:end}).redirected,undefined,'deadline closes enrollment even with stored arm');
 assert(run(first.redirected,{store:first.store,now:end+1}).exp.enrolled,'previous assigned destination remains attributable');
}
assert.equal(run('es/?'+campaign,{unavailable:true}).redirected,undefined);
assert.equal(run('es/?'+campaign,{now:end+1}).redirected,undefined);
for(const path of ['es/','es/?meta_ad_id=other&meta_campaign_id=120250216188090633','es/?preview=1&'+campaign,'es/b3/?preview=1','es/b3/']){const r=run(path);assert.equal(r.redirected,undefined);assert(!r.exp.enrolled)}
const preview=run('es/b3/?preview=1');assert(preview.exp.preview);assert.equal(preview.exp.checkout(new URL('https://pay.hotmart.com/T107441078P')).searchParams.get('sck'),'preview_ab0906r3B');
const invalid=new Map([['pr_ab_20260906_r3_session','{"variant":"evil","started":0}']]);assert(run('es/?'+campaign,{store:invalid}).redirected.endsWith('a3/?'+campaign));
const noMacro=new URLSearchParams(campaign);noMacro.delete('meta_ad_id');noMacro.delete('meta_campaign_id');assert(run('es/?'+noMacro).redirected,'native name|ID fallback enrolls');
console.log('PASS: exact campaign eligibility, 50/50 boundaries, sticky session, storage failure fallback, deadline, preview exclusion, exposure deduplication, and SCK without changing XCOD inputs');

assert(fs.readFileSync(new URL('../vsl/experiment.js',import.meta.url),'utf8').includes('var ENABLED = false;'));
const previousRound=new Map([['pr_ab_20260906_session',JSON.stringify({variant:'B',started:end-5000})]]);
assert(!run('es/b3/',{store:previousRound}).exp.enrolled,'old experiment assignment cannot classify a new-round page');
const newRound=run('es/?'+campaign,{store:previousRound,random:0.2});
assert(newRound.redirected.includes('/a3/'),'new round gets its own assignment');
assert(previousRound.has('pr_ab_20260906_session'),'old attribution remains available for already open pages');
assert(previousRound.has('pr_ab_20260906_r3_session'));
console.log('PASS: old and new experiment cohorts remain separate');

assert(fs.readFileSync(new URL('../vsl/experiment-r2.js',import.meta.url),'utf8').includes('var ENABLED = false;'));
const r2Store=new Map([['pr_ab_20260906_r2_session',JSON.stringify({variant:'B',started:end-5000})]]);
assert(!run('es/b3/',{store:r2Store}).exp.enrolled);
assert(run('es/?'+campaign,{store:r2Store,random:0.2}).redirected.includes('/a3/'));
assert(r2Store.has('pr_ab_20260906_r2_session'));
console.log('PASS: R2 is closed and R3 does not inherit R2 enrollment');
