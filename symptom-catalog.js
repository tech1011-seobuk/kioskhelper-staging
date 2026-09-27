let symptomCatalog={},symptomCatalogReady=false;
const REMOVED_SYMPTOMS=['PRT-9','PRT-11','PRT-12','PRT-14','PC-3'];
function symptomActive(sid){return symptomCatalog[sid]?.active??!REMOVED_SYMPTOMS.includes(sid);}
function knownSymptom(sid){return Object.hasOwn(BUILTIN_TREES,sid)||Object.hasOwn(symptomCatalog,sid);}
function symptomDefaults(sid){const device=DEVICES.find(d=>d.symptoms.includes(sid))?.name||'지폐투입기';return {symptom_id:sid,label:DIAGRAM_HOT_TOPICS.find(t=>t.sid===sid)?.label||SYMPTOM_LABEL[sid]||sid,device,scope:['모니터','PC','카드리더기','CMS'].includes(device)?'shared':device==='서비스코인'?'snapism':'photoism',active:symptomActive(sid),revision:0};}
function catalogSymptoms(device,brand){const base=DEVICES.find(d=>d.name===device)?.symptoms||[];return [...new Set([...base,...Object.keys(symptomCatalog).filter(id=>symptomCatalog[id].device===device)])].filter(id=>{const row=symptomCatalog[id];return symptomActive(id)&&(!row||row.scope==='shared'||row.scope===brand);});}
function applySymptomCatalog(rows){
 const next={};for(const r of rows){if(!/^[A-Z][A-Z0-9-]{0,39}$/.test(r.symptom_id)||typeof r.label!=='string'||!r.label.trim()||r.label.length>120||typeof r.device!=='string'||!['photoism','snapism','shared'].includes(r.scope)||typeof r.active!=='boolean'||!Number.isInteger(r.revision)||r.revision<1)throw Error('항목 목록 형식을 확인해주세요.');next[r.symptom_id]=r;}
 symptomCatalog=next;for(const r of rows)SYMPTOM_LABEL[r.symptom_id]=r.label;
}
async function loadSymptomCatalog(){
 const owner=currentUser?.id,key='symptomCatalog:'+SUPABASE_URL;symptomCatalogReady=false;
 try{const rows=[];let after=null;while(true){let q=sb.from('helper_symptom_catalog').select('*').order('symptom_id').limit(100);if(after)q=q.gt('symptom_id',after);const {data,error}=await q;if(error)throw error;if(!data?.length)break;rows.push(...data);after=data.at(-1).symptom_id;}
 if(currentUser?.id!==owner)return false;applySymptomCatalog(rows);symptomCatalogReady=true;try{localStorage.setItem(key,JSON.stringify(rows));}catch{}return true;
 }catch{try{if(currentUser?.id===owner)applySymptomCatalog(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}return false;}
}
async function openSymptomManager(device,brand,onChange){
 if(APP_ENV!=='staging'||currentUser?.role!=='admin'||diagramSaving||mediaUploading)return;
 const owner=currentUser.id;if(!await loadPublishedDiagnosis()){showToast('안내','항목 목록을 불러오지 못했습니다. 다시 시도해주세요.');return;}if(currentUser?.id!==owner||appState!=='diagramEditor')return;
 const dialog=document.createElement('dialog');dialog.style.cssText='width:min(680px,92vw);max-height:85vh;overflow:auto;background:var(--panel,#24262c);color:var(--text,#fff);border:1px solid var(--border);border-radius:16px;padding:20px';
 dialog.innerHTML='<button data-close style="float:right">닫기</button><h2>증상 항목 관리</h2><p></p><label>새 항목 이름<input maxlength="120" aria-label="새 항목 이름"></label><button data-add>＋ 항목 추가</button><p role="status"></p><div data-list></div>';
 dialog.querySelector('p').textContent=device+' · 이름 변경은 바로 반영됩니다. 삭제해도 조치 내용은 보관되며 복구할 수 있습니다. 새 항목은 추가 후 내용 편집에서 안내를 작성해주세요.';
 document.body.appendChild(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-close]').onclick=()=>dialog.close();let busy=false;
 function rows(){return [...new Set([...(DEVICES.find(d=>d.name===device)?.symptoms||[]),...Object.keys(symptomCatalog)])].map(id=>symptomCatalog[id]||symptomDefaults(id)).filter(r=>r.device===device&&(r.scope==='shared'||r.scope===brand));}
 function draw(){const list=dialog.querySelector('[data-list]');list.innerHTML='';for(const r of rows()){const box=document.createElement('section');box.className='helper-card';const label=document.createElement('input');label.value=r.label;label.maxLength=120;label.setAttribute('aria-label',r.symptom_id+' 항목 이름');box.appendChild(label);const state=document.createElement('p');state.textContent=r.active?r.symptom_id:'삭제됨 · '+r.symptom_id;box.appendChild(state);for(const [text,action]of [['이름 저장',()=>save({...r,label:label.value})],[r.active?'항목 삭제':'복구',()=>save({...r,active:!r.active})],['내용 편집',()=>{dialog.close();onChange(r.symptom_id);} ]]){const b=document.createElement('button');b.textContent=text;b.onclick=action;box.appendChild(b);}list.appendChild(box);}}
 async function save(row){
 if(busy)return;const status=dialog.querySelector('[role=status]');if(!row.label.trim()){status.textContent='항목 이름을 입력해주세요.';return;}
 busy=true;dialog.querySelectorAll('button,input').forEach(x=>x.disabled=true);const owner=currentUser.id;
 try{if(!symptomCatalogReady)throw Error('서버 목록을 먼저 불러와주세요.');const {error}=await sb.rpc('save_symptom_catalog',{p_id:row.symptom_id,p_label:row.label.trim(),p_device:row.device,p_scope:row.scope,p_active:row.active,p_revision:row.revision});if(error)throw error;if(currentUser?.id!==owner){dialog.close();return;}
 if(!await loadPublishedDiagnosis())throw Error('저장은 완료됐지만 목록을 다시 불러오지 못했습니다. 창을 다시 열어주세요.');status.textContent='저장했습니다. 테스트 사이트에 적용됐어요.';dialog.querySelector('input[aria-label="새 항목 이름"]').value='';draw();onChange();
 }catch(e){status.textContent=e.message||'저장하지 못했습니다. 입력 내용은 유지됩니다.';}finally{busy=false;dialog.querySelectorAll('button,input').forEach(x=>x.disabled=false);}}
 dialog.querySelector('[data-add]').onclick=()=>save({symptom_id:'CUS-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),label:dialog.querySelector('input[aria-label="새 항목 이름"]').value,device,scope:['모니터','PC','카드리더기','CMS'].includes(device)?'shared':brand,active:true,revision:0});
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});draw();
}
