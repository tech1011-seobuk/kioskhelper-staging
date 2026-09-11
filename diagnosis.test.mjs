import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function harness(rpc){
 const values=new Map();
 const ctx=vm.createContext({TextEncoder, URL, navigator:{onLine:true}, SUPABASE_URL:'https://test.supabase.co', APP_ENV:'staging', currentUser:{id:'admin',role:'admin'},
  localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},
  document:{getElementById:()=>null,querySelectorAll:()=>[]},closeEdgePopover(){},showToast(){},
  sb:{rpc:rpc||(()=>{})},diagramOptState:{}});
 vm.runInContext(section('const SYMPTOM_LABEL =','/* ============================= STATE')+'\n'+section('/* ============================= PUBLISHED DIAGNOSIS','/* ============================= END PUBLISHED DIAGNOSIS')+'\nglobalThis.api={TREES,validateDiagnosisTree,applyPublishedRows,diagnosisStore,getDiagramDraft,saveDiagram};',ctx);
 return ctx;
}
test('all 42 builtin trees satisfy publication validation, including legitimate retry loops',()=>{
 const c=harness(); assert.equal(Object.keys(c.api.TREES).length,42);
 for(const tree of Object.values(c.api.TREES)) c.api.validateDiagnosisTree(tree);
});
test('invalid connections, trapped loops and unsupported markup fields are rejected',()=>{
 const c=harness();
 const tree={start:'n1',nodes:{n1:{text:'안내',options:[{label:'반복',next:'n1'}]}}};
 assert.throws(()=>c.api.validateDiagnosisTree(tree),/종료/);
 tree.nodes.n1.options[0].next='missing';assert.throws(()=>c.api.validateDiagnosisTree(tree),/없는 단계/);
 tree.nodes.n1.options=[{label:'끝',end:'solved'}];tree.nodes.n1.html='<script>';
 assert.throws(()=>c.api.validateDiagnosisTree(tree));
});
test('published rows are applied atomically on validation failure',()=>{
 const c=harness(), before=JSON.stringify(c.api.TREES);
 assert.throws(()=>c.api.applyPublishedRows([{symptom_id:'CAM-1',revision:1,tree:{}}],'server'));
 assert.equal(JSON.stringify(c.api.TREES),before);
});
test('save uses revision comparison and only publishes after server acknowledgement',async()=>{
 let payload;
 const c=harness(async(name,args)=>{payload=args;return {data:{symptom_id:args.p_symptom_id,tree:args.p_tree,revision:2}};});
 const sid=Object.keys(c.api.TREES)[0], original=JSON.stringify(c.api.TREES[sid]);
 c.api.applyPublishedRows([{symptom_id:sid,revision:1,tree:c.api.TREES[sid]}],'server');
 const draft=c.api.getDiagramDraft(sid);draft.tree.nodes[draft.tree.start].text+=' 수정';draft.dirty=true;
 assert.equal(JSON.stringify(c.api.TREES[sid]),original);
 await c.api.saveDiagram(sid);assert.equal(payload.p_expected_revision,1);assert.equal(c.api.diagnosisStore.rows[sid].revision,2);assert.equal(draft.dirty,false);
});
test('conflicting save preserves published content and local draft',async()=>{
 const c=harness(async()=>({error:{code:'40001',message:'conflict'}}));
 const sid=Object.keys(c.api.TREES)[0];c.api.applyPublishedRows([{symptom_id:sid,revision:1,tree:c.api.TREES[sid]}],'server');
 const original=JSON.stringify(c.api.TREES[sid]);const draft=c.api.getDiagramDraft(sid);draft.tree.nodes[draft.tree.start].text+=' 수정';draft.dirty=true;
 await c.api.saveDiagram(sid);assert.equal(JSON.stringify(c.api.TREES[sid]),original);assert.equal(draft.dirty,true);
});
test('staff cannot invoke editor save',async()=>{
 let called=false;const c=harness(async()=>{called=true});c.currentUser.role='staff';await c.api.saveDiagram('CAM-1');assert.equal(called,false);
});

test('adding steps and choices preserves original tree and creates valid unique connections',()=>{
 const c=harness(),tree=c.api.TREES['CAM-1'],before=JSON.stringify(tree);
 c.tree=tree;vm.runInContext("globalThis.added=extendDiagnosisTree(tree,tree.start,'step');globalThis.twice=extendDiagnosisTree(added,tree.start,'step');",c);
 assert.equal(JSON.stringify(tree),before);assert.ok(c.twice.nodes.new1);assert.ok(c.twice.nodes.new2);
 assert.equal(c.twice.nodes[tree.start].options.at(-1).next,'new2');c.api.validateDiagnosisTree(c.twice);
 vm.runInContext("globalThis.choice=extendDiagnosisTree(tree,tree.start,'option');",c);
 assert.equal(c.choice.nodes[tree.start].options.at(-1).label,'해결되었습니다');
});

test('database JSON key ordering does not create a false unsaved draft',()=>{ const c=harness();vm.runInContext("globalThis.equal=sameDiagnosis({text:'a',options:[{label:'ok',end:'solved'}]},{options:[{end:'solved',label:'ok'}],text:'a'});",c);assert.equal(c.equal,true); });

test('new large card can replace an existing option destination without adding choices',()=>{const c=harness();c.tree=c.api.TREES['CAM-1'];const original=JSON.stringify(c.tree);vm.runInContext("globalThis.card=createDiagnosisCard(tree,tree.start,1);",c);assert.equal(JSON.stringify(c.tree),original);const option=c.card.tree.nodes[c.tree.start].options[1];assert.equal(option.label,c.tree.nodes[c.tree.start].options[1].label);assert.equal(option.next,c.card.id);assert.equal(option.end,undefined);assert.equal(c.card.tree.nodes[c.tree.start].options.length,c.tree.nodes[c.tree.start].options.length);c.api.validateDiagnosisTree(c.card.tree);});

test('media validation accepts HTTPS and private file references but rejects unsafe URLs',()=>{const c=harness();vm.runInContext("validateDiagnosisMedia([{kind:'image',url:'https://example.com/a.jpg',name:'사진'}]);",c);assert.throws(()=>vm.runInContext("validateDiagnosisMedia([{kind:'link',url:'javascript:alert(1)',name:'bad'}]);",c));assert.throws(()=>vm.runInContext("validateDiagnosisMedia([{kind:'image',path:'../secret',name:'bad'}]);",c));});
