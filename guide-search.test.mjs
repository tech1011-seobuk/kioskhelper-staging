import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const root=new URL('.',import.meta.url),read=name=>fs.readFileSync(new URL(name,root),'utf8');
const html=read('index.html');
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,start);return html.slice(a,b);}
function harness(){
 const c=vm.createContext({});
 vm.runInContext(section('const SYMPTOM_LABEL =','/* ============================= STATE')+read('symptom-catalog.js'),c);
 for(const name of ['CAMERA_MODELS','PRINTER_MODELS'])vm.runInContext(section('const '+name+' =','];')+'];',c);
 vm.runInContext(section('const REPLACEMENT_GUIDES =','function replacementCards'),c);
 vm.runInContext('const SNAPISM_MANUALS='+read('snapism-manuals.json')+';'+read('snapism-manuals-ui.js'),c);
 vm.runInContext('function hotTopicLabel(sid){return symptomCatalog[sid]?.label||SYMPTOM_LABEL[sid]||sid;}'+read('guide-search.js'),c);
 return c;
}
test('search normalizes Korean aliases, error codes, spacing, and ranks exact guide codes first',()=>{
 const c=harness();
 vm.runInContext(`const entries=buildGuideSearchIndex();globalThis.result={
 es:rankGuideSearch(entries,'es-1')[0],err:rankGuideSearch(entries,'에러70'),
 fan:rankGuideSearch(entries,'냉각펜'),camera:rankGuideSearch(entries,'M50 교체'),
 empty:rankGuideSearch(entries,'절대로없는검색어'),short:rankGuideSearch(entries,'a')};`,c);
 assert.equal(c.result.es.code,'ES-1');assert.ok(c.result.err.some(e=>e.device==='카메라'));
 assert.ok(c.result.fan.length);assert.ok(c.result.camera.some(e=>e.route==='replace'&&e.model==='m50'));
 assert.equal(c.result.empty.length,0);assert.equal(c.result.short.length,0);
});
test('search respects brand, hides retired and held guides, and indexes approved step text',()=>{
 const c=harness();
 vm.runInContext(`symptomCatalog['ES-1']={active:false};globalThis.entries=buildGuideSearchIndex();globalThis.filtered=rankGuideSearch(entries,'프린터','snapism');`,c);
 assert.ok(!c.entries.some(e=>e.sid==='ES-1'||e.sid==='PRT-9'));
 assert.ok(!c.entries.some(e=>e.title.includes('원문 확인 중')||e.title.includes('Ink Run Out')));
 assert.ok(c.filtered.length);assert.ok(c.filtered.every(e=>e.brand==='snapism'));
 assert.ok(c.entries.some(e=>e.body.includes('핫슈')));
 assert.ok(c.entries.every(e=>!('email' in e)&&!('user_id' in e)));
});
test('each indexed route resolves to the correct model, variant or approved manual',()=>{
 const c=harness();vm.runInContext(`globalThis.failures=buildGuideSearchIndex().filter(e=>e.route==='replace'?!REPLACEMENT_GUIDES[e.key]?.[e.variant]:e.route==='snap'?!snapEntries(e.device,e.category)[e.index]?.cards.length:e.route==='camera'?!CAMERA_MODELS.some(m=>m.id===e.model):!TREES[e.sid]);`,c);
 assert.equal(c.failures.length,0);
});
test('replacement next retains media nodes and height, while changing a variant replaces media',()=>{
 class El{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.height=300;}
  appendChild(x){if(x.tag==='fragment')this.children.push(...x.children);else this.children.push(x);return x;}
  set innerHTML(x){this.children=[];}setAttribute(){}focus(o){assert.equal(o.preventScroll,true);}
  getBoundingClientRect(){return {height:this.height};}replaceChildren(...x){this.children=[];x.forEach(n=>this.appendChild(n));}
  querySelector(tag){for(const x of this.children){if(x.tag===tag)return x;const n=x.querySelector(tag);if(n)return n;}return null;}
 }
 let mediaCalls=0;const doc={createElement:t=>new El(t),createDocumentFragment:()=>new El('fragment')};
 const c=vm.createContext({document:doc,REPLACEMENT_GUIDES:{에스라이트:[{label:'A',steps:[['first','long'],['second','short']]},{label:'B',steps:[['other','body']]}]},appendReplacementMedia(host){mediaCalls++;host.appendChild(new El('iframe'));},goToCameraBasicSetup(){},goToCameraColorGuideContent(){}});
 vm.runInContext(section('function replacementCards(','function appendReplacementMedia('),c);
 const host=new El('main');c.appendReplacementGuide(host,'에스라이트');const sectionEl=host.children[0],media=sectionEl.children.at(-2),stage=sectionEl.children.at(-1),player=media.children[0];
 const next=()=>stage.children[0].children.at(-1).children[1].onclick();next();next();
 assert.equal(mediaCalls,1);assert.equal(media.children[0],player);assert.equal(stage.style.minHeight,'300px');
 sectionEl.children[1].children[1].onclick();assert.equal(mediaCalls,2);assert.notEqual(media.children[0],player);
});
