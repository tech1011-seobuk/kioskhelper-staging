import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const data=JSON.parse(readFileSync(new URL('snapism-manuals.json',import.meta.url)));
test('SNAPISM reviewed equipment sources exclude both disputed procedures and wrong model image',()=>{
 assert.equal(data.length,16);
 assert.equal(data.flatMap(m=>m.sections).filter(s=>s.held).length,2);
 for(const m of data){assert.match(m.source,/channel.works\/op2z1\/document\/spaces\/12234\/articles\//);for(const s of m.sections){if(s.held)assert.equal(s.cards.length,0);for(const c of s.cards){assert.doesNotMatch(c.text,/DS-RX1/);for(const u of c.images)assert.equal(new URL(u).hostname,'cf.channel.io');for(const u of c.videos)assert.match(u,/^https:\/\/www.youtube.com\/watch\?v=/);}}}
});
test('SNAPISM printer routes match their model and shared replacement only; photo inventory includes applied manuals',()=>{
 const ctx=vm.createContext({URL,SNAPISM_MANUALS:data});vm.runInContext(readFileSync(new URL('snapism-manuals-ui.js',import.meta.url),'utf8'),ctx);vm.runInContext(readFileSync(new URL('community-ui.js',import.meta.url),'utf8'),ctx);
 assert.ok(data.filter(m=>ctx.snapManualMatches(m,'CX7600 프린터 (포토카드)')).every(m=>m.device==='CX7600'||m.device==='프린터'));
 assert.equal(ctx.helperPhotoCatalog({},{}).length,74);
 assert.equal(ctx.helperPhotoCoverage({},{},{}).length,16);
 assert.equal(new Set(data.flatMap(m=>m.sections.flatMap(s=>s.cards.flatMap(c=>c.videos)))).size,2);
});
test('SNAPISM categories separate model-specific repairs, replacement and care while preserving held sections',()=>{
 const ctx=vm.createContext({URL,SNAPISM_MANUALS:data});vm.runInContext(readFileSync(new URL('snapism-manuals-ui.js',import.meta.url),'utf8'),ctx);
 const repair=ctx.snapEntries('CX7600','repair');assert.equal(repair.length,12);assert.ok(repair.find(e=>e.title.includes('Ink Run Out')).held);
 assert.equal(ctx.snapEntries('CX7600','replace').length,1);assert.ok(ctx.snapEntries('CX7600','replace')[0].sections.every(s=>!s.title.includes('DS620')));
 assert.ok(ctx.snapEntries('DS620','replace')[0].sections.every(s=>!s.title.includes('CX7600')));
 assert.equal(ctx.snapEntries('CX7600','care').length,5);assert.equal(ctx.snapEntries('카드리더기','repair')[0].sections.length,5);
 const reachable=new Set(['CX7600','DS620','모니터','PC','카드리더기','서비스코인','키오스크'].flatMap(d=>['repair','replace','care','info'].flatMap(c=>ctx.snapEntries(d,c).flatMap(e=>e.cards.flatMap(s=>s.images)))));
 assert.equal(reachable.size,74);
});

function presentationHarness(){
 const manuals=JSON.parse(readFileSync(new URL('editable-manuals.json',import.meta.url)));
 const c=vm.createContext({URL,SNAPISM_MANUALS:data,manuals});
 vm.runInContext(readFileSync(new URL('snapism-manuals-ui.js',import.meta.url),'utf8'),c);return {c,manuals};
}
test('two public categories retain all actionable manuals and stable editor IDs, excluding information-only and held routes',()=>{
 const {c,manuals}=presentationHarness();
 for(const device of ['CX7600','DS620','모니터','PC','카드리더기','서비스코인','키오스크']){
  const entries=['repair','replace'].flatMap(category=>c.snapMenuEntries(device,category));
  assert.ok(entries.every(e=>!e.held&&manuals.some(m=>m.source===e.editSource)));
  const expected=['repair','replace','care'].flatMap(category=>c.snapEntries(device,category)).filter(e=>!e.held).map(e=>e.editSource).sort();
  assert.deepEqual(entries.map(e=>e.editSource).sort(),expected);
  assert.ok(entries.every(e=>!e.editSource.includes(':info:')));
 }
 assert.ok(c.snapMenuEntries('CX7600','repair').some(e=>e.title==='클리닝 카드 청소'));
 assert.ok(c.snapMenuEntries('CX7600','replace').some(e=>e.title==='RT필름 교체'));
});
test('presentation combines repeated consecutive photos without changing original manuals, text or non-decorative media',()=>{
 const {c,manuals}=presentationHarness();
 for(const manual of manuals.filter(m=>m.source.startsWith('snap:')&&!m.held)){
  const snapshot=JSON.stringify(manual.tree),display=c.snapDisplayTree(manual.tree),nodes=Object.values(display.nodes);
  const text=nodes.flatMap(n=>n.snapParts||[]).join('\n');
  for(const n of Object.values(manual.tree.nodes))if(n.text!=='영상 매뉴얼')assert.ok(text.includes(c.snapStepText(n.text)),manual.title+' '+n.text);
  const urls=ns=>[...new Set(ns.flatMap(n=>n.media||[]).filter(m=>!c.snapDecorativeImage(m)).map(m=>m.path||m.url))].sort();
  assert.deepEqual(urls(nodes),urls(Object.values(manual.tree.nodes)),manual.title);
  assert.equal(JSON.stringify(manual.tree),snapshot);
  for(const n of nodes)for(const o of n.options||[])if(o.next)assert.ok(display.nodes[o.next]);
 }
 const card=manuals.find(m=>m.source==='snap:카드리더기:repair:194908:all');
 const grouped=c.snapDisplayTree(card.tree);assert.equal(Object.keys(grouped.nodes).length,8);
 assert.equal(grouped.nodes.n1.snapParts.length,2);assert.equal(grouped.nodes.n1.media.length,1);
 assert.equal(grouped.nodes.n3.snapParts.length,3);
});
test('merging preserves branch points, shared targets, edge notes, attachments and loops',()=>{
 const {c}=presentationHarness();const image={kind:'image',url:'https://example.com/photo.jpg'};
 const node=(text,options,extra={})=>({text,media:[image],options,...extra});
 for(const type of ['branch','shared','note','attachment','loop']){
  const tree={start:'a',nodes:{a:node('first',[{label:'next',next:'b'}]),b:node('second',[{label:'done',end:'info'}])}};
  if(type==='branch')tree.nodes.a.options.push({label:'other',next:'c'}),tree.nodes.c=node('third',[{end:'info'}]);
  if(type==='shared')tree.nodes.c=node('third',[{next:'b'}]);
  if(type==='note')tree.nodes.a.options[0].note='important';
  if(type==='attachment')tree.nodes.b.attachment='important';
  if(type==='loop')tree.nodes.b.options=[{label:'back',next:'a'}];
  const display=c.snapDisplayTree(tree);assert.ok(display.nodes.b,type);
 }
});
test('emoji assets are excluded while photos and private image paths remain intact',()=>{
 const {c}=presentationHarness();
 const media=[{kind:'image',url:'https://cf.channel.io/asset/emoji/images/80/white_check_mark.png'},{kind:'image',url:'https://cf.channel.io/document/spaces/12234/usermedia/photo'},{kind:'image',path:'saved/photo.jpg'}];
 const result=c.snapDisplayTree({start:'a',nodes:{a:{text:'본문',media,options:[{label:'완료',end:'info'}]}}});
 assert.equal(result.nodes.a.media.length,2);assert.equal(result.nodes.a.text,'본문');
});
test('SNAPISM reader honors saved branches and records a user-selected outcome once with matching attempt metadata',async()=>{
 class El{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attrs={};this.textContent='';}
  appendChild(el){el.parent=this;this.children.push(el);return el;}
  remove(){this.parent.children=this.parent.children.filter(e=>e!==this);}
  replaceChildren(...els){this.children=[];els.forEach(e=>this.appendChild(e));}
  setAttribute(k,v){this.attrs[k]=v;}focus(){}scrollIntoView(){}
  all(){return this.children.flatMap(el=>[el,...el.all()]);}
  querySelectorAll(tag){return this.all().filter(el=>el.tag===tag);}
  querySelector(s){return this.all().find(el=>s==='[data-snap-result]'&&el.dataset.snapResult);}
 }
 const {c,manuals}=presentationHarness(),meta=manuals.find(m=>m.source==='snap:PC:repair:194902:0'),events=[],media=[];
 c.document={createElement:tag=>new El(tag)};c.window={matchMedia:()=>({matches:true})};c.crypto={randomUUID:()=> 'test-attempt'};
 c.editableManualSource=source=>manuals.find(m=>m.source===source);c.diagnosisStore={rows:{[meta.id]:{tree:{start:'a',nodes:{a:{text:'저장한 안내',options:[{label:'정상',next:'b'},{label:'다른 확인',next:'c'}]},b:{text:'두 번째',options:[{label:'완료',end:'info'}]},c:{text:'다른 안내',options:[{label:'완료',end:'info'}]}}}}}};
 const original=JSON.stringify(c.diagnosisStore.rows);c.logEvent=(type,payload)=>events.push({type,...payload});c.renderDiagnosisMedia=n=>{media.push(n);return '';};c.hydrateDiagnosisMedia=()=>{};c.render=()=>{};
 vm.runInContext("snapManualFilter='PC';snapCategory='repair';snapBeginGuide(snapEntries('PC','repair')[0]);",c);
 const host=new El('main');c.appendSnapGuide(host,c.snapEntries('PC','repair')[0]);
 assert.equal(events.length,1);assert.equal(media[0].text,'저장한 안내');
 host.querySelectorAll('button').find(b=>b.textContent==='정상').onclick();assert.equal(events.length,1);
 const result=host.querySelectorAll('button').find(b=>b.textContent==='해결됐어요');result.onclick();result.onclick();
 assert.equal(events.length,2);assert.equal(events[1].outcome,'solved');assert.equal(events[0].detail,events[1].detail);assert.equal(events[0].symptomId,meta.id);
 assert.equal(JSON.stringify(c.diagnosisStore.rows),original);
 await Promise.resolve();
});
