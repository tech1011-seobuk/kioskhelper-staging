import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
function section(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));}
test('review fixes invalidate on actual content changes, not object key order; notes and account isolation persist',()=>{
 const data=new Map(),ctx=vm.createContext({localStorage:{getItem:k=>data.get(k)},tree:{start:'a',nodes:{a:{text:'first'}}},owner:'one'});
 vm.runInContext("function diagramDraftKey(){return owner;}function getDiagramDraft(){return {tree};}"+section('function sameDiagnosis(', 'function cloneDiagnosis(')+readFileSync(new URL('manual-reviews.js',import.meta.url),'utf8')+section('function manualReviewState(', 'function bindManualReview('),ctx);
 assert.equal(ctx.manualReviewState('CAM-3').status,'검토 전');
 data.set('one:review:CAM-3',JSON.stringify({status:'픽스',note:'사진 확인',content:JSON.stringify({nodes:{a:{text:'first'}},start:'a'})}));
 assert.equal(ctx.manualReviewState('CAM-3').status,'픽스');
 ctx.tree.nodes.a.text='edited';assert.equal(ctx.manualReviewState('CAM-3').status,'업데이트 중');assert.equal(ctx.manualReviewState('CAM-3').note,'사진 확인');
 ctx.owner='two';assert.equal(ctx.manualReviewState('CAM-3').status,'검토 전');
 assert.equal(ctx.manualReviewState('manual',{steps:[]}).status,'검토 전');
});
test('diagram always uses native size, including old zoom restore values',()=>{
 const canvas={style:{}},ctx=vm.createContext({document:{getElementById:()=>canvas},closeEdgePopover(){}});
 vm.runInContext(section('function setDiagramZoom(', 'function copyDiagramContent('),ctx);
 for(const scale of [.15,.5,1,1.6]){ctx.setDiagramZoom(scale);assert.equal(canvas.style.zoom,1);}
 assert.doesNotMatch(html,/id="diagramZoom(?:In|Out|Reset)"/);
});
test('diagram shortcuts save, undo, preserve text undo and ignore non-editor or busy states',()=>{
 const calls=[],ctx=vm.createContext({APP_ENV:'staging',currentUser:{role:'admin'},appState:'diagramEditor',diagramSelectedSid:'CAM-3',diagramSaving:false,mediaUploading:false,document:{getElementById:()=>({})},saveDiagram:s=>calls.push('save:'+s),undoDiagramAddition:s=>calls.push('undo:'+s)});
 vm.runInContext(section('function diagramKeyboardShortcut(',"document.addEventListener('keydown',diagramKeyboardShortcut)"),ctx);
 let prevented=0;const event=key=>({key,ctrlKey:true,preventDefault:()=>prevented++,target:{closest:()=>false}});
 ctx.diagramKeyboardShortcut(event('s'));ctx.diagramKeyboardShortcut(event('z'));assert.deepEqual(calls,['save:CAM-3','undo:CAM-3']);
 ctx.diagramKeyboardShortcut({...event('z'),target:{closest:()=>true}});assert.equal(prevented,2);
 ctx.diagramSaving=true;ctx.diagramKeyboardShortcut(event('s'));assert.equal(calls.length,2);
 ctx.diagramSaving=false;ctx.appState='hub';ctx.diagramKeyboardShortcut(event('s'));assert.equal(calls.length,2);
});

test('server reviews migrate only missing legacy records, survive another browser, and reject stale writes',async()=>{
 const server=new Map();let offline=false;
 function browser(entries=[]){
  const local=new Map(entries);const ctx=vm.createContext({currentUser:{id:'admin',role:'admin'},localStorage:{getItem:k=>local.get(k),get length(){return local.size;},key:i=>[...local.keys()][i]},diagramDraftKey:()=> 'owner',sb:{from:()=>({select:()=>({range:async()=>offline?{error:Error('offline')}:{data:[...server.values()]}})}),rpc:async(name,p)=>{
   if(offline)return {error:Error('offline')};const old=server.get(p.p_sid);
   if(old&&p.p_import)return {data:old};
   if((old?.revision||0)!==p.p_revision)return {error:Error('conflict')};
   const row={symptom_id:p.p_sid,status:p.p_status,note:p.p_note,content:p.p_content,revision:(old?.revision||0)+1};server.set(p.p_sid,row);return {data:row};
  }}});
  vm.runInContext(readFileSync(new URL('manual-reviews.js',import.meta.url),'utf8'),ctx);return {ctx,local};
 }
 const original=JSON.stringify({status:'픽스',note:'확인 완료',content:'{"nodes":{}}'});
 const a=browser([['owner:review:CAM-2',original]]);assert.equal(await a.ctx.loadManualReviews(),true);assert.equal(a.local.get('owner:review:CAM-2'),original);
 const b=browser();assert.equal(await b.ctx.loadManualReviews(),true);assert.equal(vm.runInContext("manualReviewRows['CAM-2'].status",b.ctx),'픽스');
 await b.ctx.saveManualReview('CAM-2','업데이트 중','서버 최신',{nodes:{}});
 await assert.rejects(a.ctx.saveManualReview('CAM-2','픽스','이전 화면',{nodes:{}}),/conflict/);
 await a.ctx.loadManualReviews();assert.equal(server.get('CAM-2').note,'서버 최신');assert.equal(a.local.get('owner:review:CAM-2'),original);
 offline=true;assert.equal(await a.ctx.loadManualReviews(),false);await assert.rejects(a.ctx.saveManualReview('CAM-2','픽스','',{nodes:{}}));
});
