import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
function section(a,b){return html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));}
test('review fixes invalidate on actual content changes, not object key order; notes and account isolation persist',()=>{
 const data=new Map(),ctx=vm.createContext({localStorage:{getItem:k=>data.get(k)},tree:{start:'a',nodes:{a:{text:'first'}}},owner:'one'});
 vm.runInContext("function diagramDraftKey(){return owner;}function getDiagramDraft(){return {tree};}"+section('function sameDiagnosis(', 'function cloneDiagnosis(')+section('function manualReviewState(', 'function bindManualReview('),ctx);
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
