import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('community-ui.js',import.meta.url),'utf8');
const ctx=vm.createContext({URL});vm.runInContext(source,ctx);
const event=(attempt,type,outcome,minute,user='u')=>({user_id:user,event_type:type,outcome,symptom_id:'PRT-1',created_at:new Date(1700000000000+minute*60000).toISOString(),detail:JSON.stringify({v:2,attempt})});
test('outcome changes are deduplicated per user and attempt, legacy records excluded',()=>{
 const events=[event('a','symptom_click',null,0),event('a','symptom_outcome','escalate',1),event('a','symptom_outcome','solved',3),event('a','symptom_outcome','solved',4),{event_type:'symptom_outcome',outcome:'solved',detail:null}];
 const m=ctx.helperMetrics(events,[]);assert.equal(m.rows.length,1);assert.equal(m.solved,1);assert.equal(m.escalate,0);assert.equal(m.median,240000);assert.equal(m.rate,100);
});
test('A/S, informational endings, pending attempts and real support clicks remain distinct',()=>{
 const events=['as','info','escalate',null].flatMap((o,i)=>[event(String(i),'symptom_click',null,0),...(o?[event(String(i),'symptom_outcome',o,1)]:[])]);
 events.push(event('2','support_click',null,2),event('2','support_click',null,3));
 const m=ctx.helperMetrics(events,[]);assert.equal(m.completed,2);assert.equal(m.as,1);assert.equal(m.info,1);assert.equal(m.pending,1);assert.equal(m.clicks,1);assert.equal(m.rate,0);
});
test('no data is not zero satisfaction or success; long idle time excluded from median',()=>{
 const empty=ctx.helperMetrics([],[]);assert.equal(empty.rate,null);assert.equal(empty.score,null);assert.equal(empty.median,null);
 const m=ctx.helperMetrics([event('a','symptom_click',null,0),event('a','symptom_outcome','solved',100)],[]);assert.equal(m.durationCount,0);assert.equal(m.solved,1);
});
test('ratings match account and attempt; period is based on journey start',()=>{
 const events=[event('a','symptom_click',null,0),event('a','symptom_outcome','solved',1),event('a','symptom_click',null,3,'other')];
 const ratings=[{attempt_id:'a',user_id:'u',score:5},{attempt_id:'a',user_id:'outside',score:1}];
 const m=ctx.helperMetrics(events,ratings);assert.equal(m.score,5);assert.equal(m.scores,1);
 const later=ctx.helperMetrics(events,ratings,1700000000000+120000);assert.equal(later.rows.length,1);assert.equal(later.scores,0);
});
test('embedded community source matches editable source',()=>{
 const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
 assert.ok(html.includes('/* HELPER COMMUNITY START */\n'+source+'\n/* HELPER COMMUNITY END */'));
});

function popupHarness({seen=false,failWrite=false}={}){
 const buttons=new Map(),calls=[],dialogs=[];
 const c=vm.createContext({currentUser:{id:'u'},appState:'hub',navigator:{onLine:true},escapeHtml:s=>s,
  document:{body:{appendChild(){}},createElement(){const d={setAttribute(){},innerHTML:'',querySelector(key){if(!buttons.has(key))buttons.set(key,{});return buttons.get(key);},showModal(){d.shown=true;},addEventListener(name,fn){d[name+'Handler']=fn;},close(){d.closed=true;d.closeHandler?.();},remove(){}};dialogs.push(d);return d;}},
  sb:{from(table){const query={select(){return this;},eq(){return this;},lte(){return this;},or(){return this;},order(){return this;},limit(){return this;},in(){return this;},insert(payload){calls.push({table,payload});this.writing=true;return this;},then(resolve){return Promise.resolve(resolve(this.writing?{error:failWrite?{code:'offline'}:null}:{data:table==='helper_announcements'?[{id:'notice',title:'제목',body:'내용',kind:'안내'}]:seen?[{notice_id:'notice'}]:[]}));}};return query;}}
 });vm.runInContext(source,c);return {c,dialogs,buttons,calls};
}
test('confirmed notices do not open; unread notice opens once per login and saves only after confirmation',async()=>{
 const seen=popupHarness({seen:true});await seen.c.helperCheckNotices();assert.equal(seen.dialogs.length,0);
 const h=popupHarness();await h.c.helperCheckNotices();await h.c.helperCheckNotices();assert.equal(h.dialogs.length,1);assert.equal(h.calls.length,0);
 const button=h.buttons.get('[data-read]');await button.onclick({currentTarget:button});assert.equal(h.calls[0].table,'helper_notice_reads');assert.equal(h.calls[0].payload.notice_id,'notice');assert.equal(h.dialogs[0].closed,true);
});
test('failed notice acknowledgement stays open and can be retried',async()=>{
 const h=popupHarness({failWrite:true});await h.c.helperCheckNotices();const button=h.buttons.get('[data-read]');await button.onclick({currentTarget:button});assert.notEqual(h.dialogs[0].closed,true);assert.equal(button.disabled,false);assert.match(h.buttons.get('[role=status]').textContent,/저장하지 못/);
});
test('detail filters use start brand/device, preserve repeated legacy views and pair outcomes',()=>{
 const start={...event('a','symptom_click',null,0),brand:'photoism',device:'프린터'};
 const events=[start,{...start,detail:null},{...event('a','symptom_outcome','solved',2),brand:null}, {...event('b','symptom_click',null,1),brand:'snapism',device:'카메라'}];
 const d=ctx.helperSymptomStats(events,[],0,{brand:'photoism',device:'프린터'});
 assert.equal(d.views,2);assert.equal(d.popular[0].started,1);assert.equal(d.popular[0].solved,1);assert.equal(d.metrics.rate,100);
 assert.equal(ctx.helperSymptomStats(events,[],1700000060000,{brand:'photoism'}).views,0);
});
test('priority requires sample evidence, excludes AS-only and uses matching low ratings',()=>{
 const events=[];const ratings=[];
 for(let i=0;i<5;i++){events.push(event('a'+i,'symptom_click',null,i),event('a'+i,'symptom_outcome','escalate',i+1));}
 const d=ctx.helperSymptomStats(events,ratings);assert.equal(d.priority[0].sufficient,true);assert.equal(d.priority[0].completed,5);
 assert.equal(ctx.helperSymptomStats(events.slice(0,2),[]).priority[0].sufficient,false);
 assert.equal(ctx.helperSymptomStats([event('z','symptom_click',null,0),event('z','symptom_outcome','as',1)],[]).priority.length,0);
 const low=ctx.helperSymptomStats(events.slice(0,6).map(e=>({...e,outcome:e.outcome?'solved':null})),[0,1,2].map(i=>({user_id:'u',attempt_id:'a'+i,score:2})));
 assert.equal(low.priority[0].sufficient,true);assert.equal(low.priority[0].scores,3);
});
test('photo catalog deduplicates source images and retains every use without including videos',()=>{
 const url='https://cf.channel.io/document/spaces/8576/usermedia/a';
 const tree={X:{nodes:{n1:{text:'one',media:[{kind:'image',url,name:'사진'},{kind:'video',url:'https://example.org/v.mp4'}]},n2:{text:'two',media:[{kind:'image',url,name:'사진'}]}}}};
 const rows=ctx.helperPhotoCatalog(tree,{printer:[['교체','video','a']]});assert.equal(rows.length,1);assert.equal(rows[0].places.length,3);assert.equal(rows[0].channel,true);
});
test('coverage keeps missing steps and distinguishes replacement reference photos',()=>{
 const rows=ctx.helperPhotoCoverage({X:{nodes:{a:{text:'connect'},b:{text:'inspect',media:[{kind:'image',url:'https://example.org/a'}]}}}},{printer:[['reference','v','photo']]},{printer:[{label:'printer',steps:[['remove','unplug'],['install','attach']]}]});
 assert.equal(rows[0].total,2);assert.equal(rows[0].withPhoto,1);assert.equal(rows[1].count,1);assert.equal(rows[1].withPhoto,0);assert.equal(rows[1].total,2);assert.equal(rows[1].reference.length,1);
});
