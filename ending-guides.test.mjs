import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('ending-guides-ui.js',import.meta.url),'utf8');
function context(){const c=vm.createContext({END_META:{solved:{label:'해결',desc:'기본'},as:{label:'A/S',desc:'수리'},info:{label:'완료',desc:'안내'},escalate:{label:'문의',desc:'문의'}},DEVICES:[{name:'카메라',symptoms:['CAM-1']},{name:'프린터',symptoms:['PRT-1']}],selectedDevice:'',sb:null,currentUser:{id:'a'}});vm.runInContext(source+'\nglobalThis.setGuides=r=>endingGuides=r;',c);return c;}
test('custom ending keeps outcome semantics and adds only matching device notes',()=>{
 const c=context();c.setGuides({custom_test:{id:'custom_test',label:'교체 접수',body:'공통 안내',result_type:'as',device_notes:{카메라:'카메라 추가'}}});
 const camera=c.resolvedEnding('custom_test','CAM-1');assert.equal(camera.endType,'as');assert.equal(camera.endTitle,'교체 접수');assert.equal(camera.endNote,'공통 안내\n\n카메라 추가');
 assert.equal(c.resolvedEnding('custom_test','PRT-1').endNote,'공통 안내');
 assert.equal(c.resolvedEnding('custom_test','CAM-1','기존 선택지 설명').endNote,'기존 선택지 설명\n\n카메라 추가');
 assert.equal(c.resolvedEnding('missing','CAM-1'),null);
});
test('invalid guide input cannot pass client validation',()=>{
 const c=context(),r={result_type:'solved',label:'완료',body:'안내',device_notes:{카메라:'추가'}};c.validateEndingGuide(r);
 for(const bad of [{...r,label:''},{...r,body:' '},{...r,result_type:'custom'},{...r,device_notes:{카메라:42}}])assert.throws(()=>c.validateEndingGuide(bad));
});
test('ending source is embedded and database writes retain admin/CAS guards',()=>{
 const html=readFileSync(new URL('index.html',import.meta.url),'utf8'),sql=readFileSync(new URL('ending-guides.sql',import.meta.url),'utf8');
 assert.ok(html.includes('/* ENDING GUIDES START */\n'+source+'\n/* ENDING GUIDES END */'));
 assert.match(sql,/not public.is_admin\(\)/);assert.match(sql,/revision=p_expected_revision/);assert.match(sql,/enable row level security/);assert.match(sql,/result_type=p_result_type/);
});
