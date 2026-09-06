import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../vsl/sales.js',import.meta.url),'utf8');
const key='pr-sales-measurement-v3';
function runtime(store,{readBlocked=false,writeBlocked=false,getterBlocked=false}={}){
 const els=Object.fromEntries(['consent','allow','deny','preferences','measurement-status'].map(id=>[id,{hidden:true,events:{},addEventListener(n,f){this.events[n]=f;},focus(){}}]));
 const links=[{events:{},addEventListener(n,f){this.events[n]=f;}}];
 els['sales-config']={dataset:{checkout:'https://pay.hotmart.com/T107442451G?checkoutMode=10',pixel:'2085840802138189',product:'8444319',lang:'pt'}};
 const listeners={};
 const window={location:{search:'?fbclid=test-click'},localStorage:{getItem:k=>{if(readBlocked)throw Error();return store.get(k)??null;},setItem:(k,v)=>{if(writeBlocked)throw Error();store.set(k,v);}},addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const storageArea=window.localStorage;
 if(getterBlocked)Object.defineProperty(window,'localStorage',{get(){throw Error('Storage access denied');}});
 const document={getElementById:id=>els[id],querySelectorAll:()=>links,createElement:()=>({setAttribute(){}}),head:{appendChild(){}}};
 vm.runInNewContext(fs.readFileSync(new URL('../vsl/attribution.js',import.meta.url),'utf8'),{window,document,URL,URLSearchParams});
  vm.runInNewContext(source,{window,document,URL,URLSearchParams});
 return {els,links,window,event:(eventKey=key)=>listeners.storage({key:eventKey,storageArea}),calls:()=>Array.from(window.fbq?.queue??[],a=>Array.from(a)),click:()=>links[0].events.click()};
}
function clicks(tab){return tab.calls().filter(c=>c[1]==='CheckoutClick').length;}
{
 const store=new Map([[key,'allow']]),a=runtime(store),b=runtime(store);
 a.els.deny.events.click();b.event();
 assert(b.calls().some(c=>c[0]==='consent'&&c[1]==='revoke'));
 assert.equal(new URL(b.links[0].href).searchParams.has('fbclid'),false);b.click();assert.equal(clicks(b),0);
 a.els.allow.events.click();b.event();b.click();assert.equal(clicks(b),1);
 assert.equal(b.calls().filter(c=>c[1]==='PageView').length,1);assert.equal(b.calls().filter(c=>c[1]==='ViewContent').length,1);
 store.delete(key);b.event(null);assert.equal(b.els.consent.hidden,false);b.click();assert.equal(clicks(b),1);
 assert.equal(store.has(key),false,'storage event does not write a preference');
}
{
 const store=new Map([[key,'allow']]),a=runtime(store),b=runtime(store);
 a.els.deny.events.click();b.click();assert.equal(clicks(b),0,'recheck closes pre-storage-event window');
}
for(const value of [null,'invalid','deny']){
 const store=new Map(value===null?[]:[[key,value]]),tab=runtime(store,{readBlocked:true,writeBlocked:true});
 tab.click();assert.equal(clicks(tab),0,'storage failure does not create consent');
 tab.els.allow.events.click();tab.click();assert.equal(clicks(tab),1,'explicit same-page consent still works');
 tab.els.deny.events.click();tab.click();assert.equal(clicks(tab),1);
}
{
 const tab=runtime(new Map([[key,'allow']]),{writeBlocked:true});
 tab.els.deny.events.click();tab.click();tab.event();tab.click();assert.equal(clicks(tab),0,'stale allow cannot override explicit denial when writing fails');
}
{
 const tab=runtime(new Map(),{getterBlocked:true});
 assert.doesNotThrow(()=>tab.event(),'a blocked localStorage getter must not escape the event handler');
 tab.click();assert.equal(clicks(tab),0,'blocked getter does not create consent');
 tab.els.allow.events.click();tab.els.deny.events.click();
 assert.doesNotThrow(()=>tab.event(null));tab.click();assert.equal(clicks(tab),0);
}
console.log('PASS: cross-tab revoke, pre-event recheck, clearing storage, reaccept without duplicate views, blocked storage without consent and failed writes preserving explicit denial.');
