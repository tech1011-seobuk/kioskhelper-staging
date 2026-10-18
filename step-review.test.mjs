import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const html=source('index.html');
const same=html.slice(html.indexOf('function sameDiagnosis('),html.indexOf('function cloneDiagnosis('));
function fixture(server=new Map(),local=new Map()){
 let offline=false,release=null,held=false,requests=0;
 const ctx=vm.createContext({APP_ENV:'staging',currentUser:{id:'admin',role:'admin'},tree:{nodes:{a:{text:'first',media:[],options:[{label:'next',next:'b'}]},b:{text:'second',media:[],options:[{label:'done',end:'solved'}]}}},localStorage:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k),get length(){return local.size;},key:i=>[...local.keys()][i]}});
 ctx.sb={from:()=>{let key;const q={select:()=>q,eq:(_,k)=>(key=k,q),range:async()=>({data:[...server.values()].filter(r=>r.owner===ctx.currentUser.id)}),maybeSingle:async()=>({data:server.get(ctx.currentUser.id+':'+key)||null})};return q;},rpc:async(_,p)=>{
  requests++;const owner=ctx.currentUser.id;
  if(held)await new Promise(r=>{release=r;});
  if(offline)return {error:Error('offline')};
  const key=owner+':'+p.p_sid,old=server.get(key);
  if((old?.revision||0)!==p.p_revision)return {error:{code:'40001',message:'conflict'}};
  const data={owner,symptom_id:p.p_sid,status:p.p_status,note:p.p_note,content:p.p_content,revision:(old?.revision||0)+1,updated_at:'2026-10-18T00:00:00Z'};server.set(key,data);return {data};
 }};
 vm.runInContext("function diagramDraftKey(){return 'staging:'+currentUser.id;}function getDiagramDraft(){return {tree};}"+same+source('manual-reviews.js')+source('step-reviews.js'),ctx);
 return {ctx,server,local,setOffline:v=>offline=v,hold:()=>held=true,release:()=>{held=false;release?.();},requests:()=>requests};
}
test('step checks combine deficiencies; fix is exclusive; toggling off returns unchecked',async()=>{
 const {ctx}=fixture();await ctx.loadManualReviews();let flags=[];
 flags=ctx.stepReviewToggle(flags,'사진 부족');flags=ctx.stepReviewToggle(flags,'설명 부족');assert.deepEqual([...flags],['설명 부족','사진 부족']);
 assert.deepEqual([...ctx.stepReviewToggle(flags,'픽스')],['픽스']);assert.deepEqual([...ctx.stepReviewToggle(['픽스'],'사진 부족')],['사진 부족']);assert.deepEqual([...ctx.stepReviewToggle(['픽스'],'픽스')],[]);
});
test('checks persist across browsers, isolate owner and stage, and never change manuals or their reviews',async()=>{
 const a=fixture();await a.ctx.loadManualReviews();const tree=JSON.stringify(a.ctx.tree);
 await a.ctx.saveManualReview('CAM-2','픽스','whole',{nodes:{}});
 await a.ctx.changeStepReview('CAM-2','a',{flags:['사진 부족','설명 부족'],note:'두 번째 사진 필요'});
 assert.equal(JSON.stringify(a.ctx.tree),tree);assert.equal(a.server.get('admin:CAM-2').note,'whole');assert.equal(a.ctx.stepReviewState('CAM-2','b',a.ctx.tree.nodes.b).status,'미확인');
 const b=fixture(a.server);await b.ctx.loadManualReviews();assert.equal(b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a).note,'두 번째 사진 필요');
 b.ctx.currentUser={id:'another',role:'admin'};await b.ctx.loadManualReviews();assert.equal(b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a).status,'미확인');
 b.ctx.APP_ENV='production';assert.equal(b.ctx.stepReviewAllowed(),false);await b.ctx.changeStepReview('CAM-2','a',{flags:['픽스']});assert.equal(a.server.size,2);
});
test('rapid checks during an in-flight save retain the final combination and revision',async()=>{
 const f=fixture();await f.ctx.loadManualReviews();f.hold();
 const save=f.ctx.changeStepReview('CAM-2','a',{flags:['사진 부족']});await Promise.resolve();
 f.ctx.changeStepReview('CAM-2','a',{flags:['사진 부족','설명 부족']});f.ctx.changeStepReview('CAM-2','a',{note:'촬영 필요'});
 f.release();await save;const state=f.ctx.stepReviewState('CAM-2','a',f.ctx.tree.nodes.a);
 assert.deepEqual([...state.flags],['설명 부족','사진 부족']);assert.equal(state.note,'촬영 필요');assert.equal(state.pending,null);assert.equal(f.requests(),2);assert.equal([...f.server.values()][0].revision,2);
});
test('offline intent survives reload, reports unsaved, and retries without false success',async()=>{
 const f=fixture();await f.ctx.loadManualReviews();f.setOffline(true);await f.ctx.changeStepReview('CAM-2','a',{flags:['사진 부족']});
 let s=f.ctx.stepReviewState('CAM-2','a',f.ctx.tree.nodes.a);assert.ok(s.pending.error);assert.equal(s.saved,false);assert.ok(f.local.size);
 const b=fixture(f.server,f.local);await b.ctx.loadManualReviews();s=b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a);assert.ok(s.pending);assert.deepEqual([...s.flags],['사진 부족']);
 await b.ctx.sendStepReview('CAM-2','a');assert.equal(b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a).pending,null);assert.equal(f.local.size,0);
});
test('stale browser cannot overwrite another review; explicit reload recovers latest',async()=>{
 const a=fixture();await a.ctx.loadManualReviews();const b=fixture(a.server);await b.ctx.loadManualReviews();
 await a.ctx.changeStepReview('CAM-2','a',{flags:['픽스']});await b.ctx.changeStepReview('CAM-2','a',{flags:['설명 부족']});
 assert.equal(b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a).pending.conflict,true);assert.deepEqual([...([...a.server.values()][0].content.flags)],['픽스']);
 await b.ctx.reloadStepReview('CAM-2','a');assert.equal(b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a).status,'픽스');assert.equal(b.ctx.stepReviewState('CAM-2','a',b.ctx.tree.nodes.a).pending,null);
});
test('fix invalidates only changed stage and a memo edit cannot silently reapprove changes',async()=>{
 const f=fixture();await f.ctx.loadManualReviews();await f.ctx.changeStepReview('CAM-2','a',{flags:['픽스']});await f.ctx.changeStepReview('CAM-2','b',{flags:['픽스']});
 f.ctx.tree.nodes.a.text='changed';assert.equal(f.ctx.stepReviewState('CAM-2','a',f.ctx.tree.nodes.a).status,'재확인');assert.equal(f.ctx.stepReviewState('CAM-2','b',f.ctx.tree.nodes.b).status,'픽스');
 await f.ctx.changeStepReview('CAM-2','a',{note:'checking again'});assert.equal(f.ctx.stepReviewState('CAM-2','a',f.ctx.tree.nodes.a).status,'재확인');
 await f.ctx.changeStepReview('CAM-2','a',{flags:['픽스']});assert.equal(f.ctx.stepReviewState('CAM-2','a',f.ctx.tree.nodes.a).status,'픽스');
});
test('report filters exact stages and exports Korean CSV safely, including multi-line notes',()=>{
 const {ctx}=fixture(),row={sid:'CAM-2',nid:'a',title:'카메라 고장',brands:['포토이즘'],device:'카메라',text:'사진 확인',status:'미비',flags:['사진 부족'],note:'=HYPERLINK("example")\n두 번째 사진',saved:true};
 assert.equal(ctx.stepReviewMatches(row,'사진 부족','카메라','CAM-2'),true);assert.equal(ctx.stepReviewMatches(row,'픽스','',''),false);assert.equal(ctx.stepReviewMatches(row,'issues','','CAM-3'),false);
 const csv=ctx.stepReviewCsv([row]);assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes("\"'=HYPERLINK(\"\"example\"\")\n두 번째 사진\""));assert.match(csv,/CAM-2/);
});
test('note-only concerns appear in the report and account changes during save never leak review state',async()=>{
 const f=fixture();await f.ctx.loadManualReviews();await f.ctx.changeStepReview('CAM-2','a',{note:'영상이 다른 기종입니다'});
 assert.equal(f.ctx.stepReviewState('CAM-2','a',f.ctx.tree.nodes.a).status,'미비');
 f.hold();const save=f.ctx.changeStepReview('CAM-2','b',{flags:['사진 부족']});await Promise.resolve();f.ctx.currentUser={id:'second',role:'admin'};f.release();await save;await f.ctx.loadManualReviews();
 assert.equal(f.ctx.stepReviewState('CAM-2','b',f.ctx.tree.nodes.b).status,'미확인');assert.equal([...f.server.values()].filter(r=>r.owner==='second').length,0);
});
