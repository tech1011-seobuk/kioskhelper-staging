import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
const html=read('index.html'),manuals=JSON.parse(read('editable-manuals.json'));
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function harness(){
 const c=vm.createContext({TextEncoder,URL,navigator:{onLine:true},SUPABASE_URL:'https://test.supabase.co',APP_ENV:'staging',currentUser:{id:'admin',role:'admin'},localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},showToast(){},closeEdgePopover(){},diagramOptState:{}});
 vm.runInContext('const EDITABLE_MANUALS='+JSON.stringify(manuals)+';\n'+read('editable-manuals.js')+'\n'+section('const SYMPTOM_LABEL =','/* ============================= STATE')+'\n'+section('/* ============================= PUBLISHED DIAGNOSIS','/* ============================= END PUBLISHED DIAGNOSIS')+'\nthis.api={TREES,BUILTIN_TREES,validateDiagnosisTree,applyPublishedRows,diagnosisStore,getDiagramDraft,editableManualChanged};',c);return c;
}
test('all 62 imported manuals have unique stable IDs and pass real editor validation',()=>{
 const c=harness();assert.equal(manuals.length,62);assert.equal(new Set(manuals.map(m=>m.id)).size,62);assert.equal(new Set(manuals.map(m=>m.source)).size,62);
 for(const m of manuals){assert.match(m.id,/^MAN-[A-F0-9]{24}$/);c.api.validateDiagnosisTree(m.tree);assert.ok(Object.keys(m.tree.nodes).length<=150);}
});
test('every SNAPISM source entry including held sections is present with all original text and media',()=>{
 const c=vm.createContext({SNAPISM_MANUALS:JSON.parse(read('snapism-manuals.json'))});vm.runInContext(read('snapism-manuals-ui.js')+'\nthis.entries=snapEntries;',c);
 let count=0;for(const device of ['CX7600','DS620','모니터','PC','카드리더기','서비스코인','키오스크'])for(const category of ['repair','replace','care','info'])for(const entry of c.entries(device,category)){
  count++;const m=manuals.find(m=>m.source===entry.editSource);assert.ok(m,entry.title);assert.equal(m.title,entry.title);assert.equal(m.held,entry.held||null);
  const nodes=Object.values(m.tree.nodes),media=nodes.flatMap(n=>n.media||[]);
  if(entry.held){assert.deepEqual(nodes.map(n=>n.text),[entry.held]);assert.equal(media.length,0);continue;}
  for(const card of entry.cards)assert.ok(nodes.some(n=>n.text===card.text),entry.title);
  assert.deepEqual(media.map(m=>m.url).sort(),Array.from(entry.cards.flatMap(c=>[...c.images,...c.videos])).sort());
 }assert.equal(count,43);
});
test('old diagnosis rows and drafts survive importing and reloading supplemental rows',()=>{
 const c=harness(),original=JSON.stringify(c.api.BUILTIN_TREES),m=manuals[0];
 const base=Object.entries(c.api.BUILTIN_TREES).map(([symptom_id,tree])=>({symptom_id,tree,revision:1}));
 c.api.applyPublishedRows([...base,...manuals.map(m=>({symptom_id:m.id,tree:m.tree,revision:2}))],'server');
 assert.equal(JSON.stringify(c.api.BUILTIN_TREES),original);assert.equal(Object.keys(c.api.TREES).length,104);
 assert.equal(c.api.editableManualChanged(m.source),false);
 const draft=c.api.getDiagramDraft(m.id);draft.tree.nodes.n1.text+=' 초안';draft.dirty=true;
 c.api.applyPublishedRows([...base,...manuals.map(m=>({symptom_id:m.id,tree:m.tree,revision:2}))],'server');
 assert.equal(c.api.getDiagramDraft(m.id).tree.nodes.n1.text,draft.tree.nodes.n1.text);assert.equal(c.api.editableManualChanged(m.source),false);
 const changed=structuredClone(m.tree);changed.nodes.n1.text+=' 저장 완료';
 c.api.applyPublishedRows([...base,{symptom_id:m.id,tree:changed,revision:3}],'server');assert.equal(c.api.editableManualChanged(m.source),true);
});
test('held manuals cannot be enabled by editing their draft or saved text',()=>{
 const c=harness();for(const m of manuals.filter(m=>m.held)){const tree=structuredClone(m.tree);tree.nodes.n1.text='수정';c.api.applyPublishedRows([{symptom_id:m.id,tree,revision:3}],'server');assert.equal(c.api.editableManualChanged(m.source),false);}
 assert.equal(manuals.filter(m=>m.held).length,2);
});
test('all supplementals are reachable from the matching brand and device editor only',()=>{
 const c=harness();vm.runInContext(section('function hotTopicLabel(', 'let manualRequestedSid='),c);
 for(const m of manuals){assert.ok(c.diagramDevicesForBrand(m.brand).find(d=>d.name===m.device)?.symptoms.includes(m.id),m.source);assert.ok(!c.diagramDevicesForBrand(m.brand==='photoism'?'snapism':'photoism').some(d=>d.symptoms.includes(m.id)));}
});
test('camera setup photos are exact exports of existing embedded image bytes',()=>{
 const imageBlock=section('const CAMERA_BASIC_SETUP_IMAGES =','const CAMERA_MODEL_HTML');
 const c=vm.createContext({});vm.runInContext(imageBlock+'\nthis.images=CAMERA_BASIC_SETUP_IMAGES;',c);
 let count=0;for(const [model,urls]of Object.entries(c.images))for(const [i,url]of urls.entries()){
  const image=manuals.find(m=>m.source==='camera:'+model+':basic').tree.nodes.n1.media[i];
  const file=new URL(image.url).pathname.split('/kioskhelper-staging/')[1];
  assert.deepEqual(readFileSync(new URL(file,import.meta.url)),Buffer.from(url.split(',')[1],'base64'));count++;
 }assert.equal(count,15);
});
test('new manual rows do not block promotion of existing diagnosis changes',()=>{
 const c=harness();vm.runInContext(section('function planProductionPromotion(', 'async function applyPromotionPlan('),c);
 const target={symptom_id:'ES-1',tree:c.api.BUILTIN_TREES['ES-1'],revision:1};const source=structuredClone(target);source.tree.nodes.n1.text+=' 변경';
 const plan=c.planProductionPromotion([source,{symptom_id:manuals[0].id,tree:manuals[0].tree,revision:2}],[target]);
 assert.equal(plan.length,1);assert.equal(plan[0].source.symptom_id,'ES-1');
 assert.throws(()=>c.planProductionPromotion([{symptom_id:'CUS-UNKNOWN',tree:source.tree,revision:1}],[]),/본 서버에 없습니다/);
});
