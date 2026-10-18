// Personal stage checks use the existing owner-scoped, revision-checked review RPC.
// These records never update diagnosis trees or whole-manual review records.
const STEP_REVIEW_FLAGS=['픽스','설명 부족','사진 부족','사진 교체 필요','기타 확인'];
const stepReviewDrafts=new Map(),stepReviewFlights=new Map();
let manualStepRequested=null;
function stepReviewAllowed(){return APP_ENV==='staging'&&currentUser?.role==='admin'&&manualReviewReady&&manualReviewOwner===currentUser.id;}
function stepReviewKey(sid,nid){const key='STEP:'+JSON.stringify([sid,nid]);if(key.length>160)throw Error('단계 식별자가 너무 깁니다.');return key;}
function stepReviewLocalKey(sid,nid){return diagramDraftKey()+':step-check:'+stepReviewKey(sid,nid);}
function stepReviewFlags(flags){const list=STEP_REVIEW_FLAGS.filter(f=>Array.isArray(flags)&&flags.includes(f));return list.includes('픽스')?['픽스']:list;}
function stepReviewToggle(flags,flag){
 if(!STEP_REVIEW_FLAGS.includes(flag))return stepReviewFlags(flags);
 if(flags.includes(flag))return flags.filter(f=>f!==flag);
 if(flag==='픽스')return ['픽스'];
 return stepReviewFlags([...flags.filter(f=>f!=='픽스'),flag]);
}
function stepReviewSaved(sid,nid){
 if(!stepReviewAllowed())return null;
 const row=manualReviewRows[stepReviewKey(sid,nid)];let value;
 try{value=JSON.parse(row?.content||'null');}catch{return null;}
 return value?.type==='step-review-v1'&&value.sid===sid&&value.nid===nid?{...value,flags:stepReviewFlags(value.flags),note:row.note||'',revision:row.revision,updated:row.updated_at}:null;
}
function stepReviewPending(sid,nid){
 if(!stepReviewAllowed())return null;
 const key=stepReviewLocalKey(sid,nid);
 if(!stepReviewDrafts.has(key)){
  let pending=null;try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch{}
  if(pending?.value?.type!=='step-review-v1'||pending.value.sid!==sid||pending.value.nid!==nid||!Number.isInteger(pending.revision))pending=null;
  if(pending){
   pending.error='미저장 체크가 이 브라우저에 남아 있습니다.';pending.value.flags=stepReviewFlags(pending.value.flags);
   const saved=stepReviewSaved(sid,nid);
   if(saved&&saved.revision!==pending.revision){
    const {revision,updated,...value}=saved;
    if(sameDiagnosis(value,pending.value)){pending=null;try{localStorage.removeItem(key);}catch{}}
    else{pending.conflict=true;pending.error='다른 화면에서 먼저 저장했습니다. 최신 기록을 확인해주세요.';}
   }
  }
  stepReviewDrafts.set(key,pending);
 }
 return stepReviewDrafts.get(key);
}
function stepReviewState(sid,nid,node){
 const saved=stepReviewSaved(sid,nid),pending=stepReviewPending(sid,nid),value=pending?.value||saved||{flags:[],note:''};
 const flags=stepReviewFlags(value.flags),changed=flags.includes('픽스')&&!sameDiagnosis(value.snapshot,node);
 return {flags,note:value.note||'',changed,status:changed?'재확인':flags.includes('픽스')?'픽스':flags.length||String(value.note||'').trim()?'미비':'미확인',pending,saved:!!saved,updated:saved?.updated||''};
}
function preserveStepReview(key,pending){
 stepReviewDrafts.set(key,pending);
 try{if(pending)localStorage.setItem(key,JSON.stringify(pending));else localStorage.removeItem(key);return true;}catch{return false;}
}
function notifyStepReviews(){
 if(typeof document==='undefined')return;
 document.querySelectorAll('.step-review').forEach(box=>box.refreshStepReview?.());
 document.dispatchEvent(new Event('stepreviewchange'));
}
function changeStepReview(sid,nid,change){
 if(!stepReviewAllowed())return;
 const node=getDiagramDraft(sid).tree.nodes[nid];if(!node)return;
 const key=stepReviewLocalKey(sid,nid),old=stepReviewPending(sid,nid),saved=stepReviewSaved(sid,nid);
 const value={type:'step-review-v1',sid,nid,flags:[],note:'',...(old?.value||saved),...change};
 if(Object.hasOwn(change,'flags')||!value.snapshot)value.snapshot=JSON.parse(JSON.stringify(node));
 delete value.revision;delete value.updated;value.flags=stepReviewFlags(value.flags);value.note=String(value.note||'').slice(0,500);
 const pending={value,revision:old?.revision??saved?.revision??0,seq:(old?.seq||0)+1,error:''};
 pending.backedUp=preserveStepReview(key,pending);notifyStepReviews();
 return sendStepReview(sid,nid);
}
function sendStepReview(sid,nid){
 if(!stepReviewAllowed())return Promise.resolve();
 const key=stepReviewLocalKey(sid,nid),owner=currentUser.id;
 if(stepReviewFlights.has(key))return stepReviewFlights.get(key);
 // Deferral registers the flight before any synchronous error or completion.
 const flight=Promise.resolve().then(async()=>{
  while(stepReviewAllowed()&&currentUser.id===owner){
   const pending=stepReviewDrafts.get(key);if(!pending)break;
   pending.error='';const seq=pending.seq,value=JSON.parse(JSON.stringify(pending.value));notifyStepReviews();
   try{
    const {note,...content}=value;
    const {data,error}=await sb.rpc('save_manual_review',{p_sid:stepReviewKey(sid,nid),p_status:value.flags.includes('픽스')?'픽스':value.flags.length?'업데이트 중':'검토 전',p_note:note,p_content:content,p_revision:pending.revision,p_import:false});
    if(error)throw error;
    if(!data||!Number.isInteger(data.revision))throw Error('저장 결과를 확인할 수 없습니다.');
    if(!stepReviewAllowed()||currentUser.id!==owner)break;
    manualReviewRows[stepReviewKey(sid,nid)]=reviewRecord(data);
    const latest=stepReviewDrafts.get(key);
    if(latest?.seq===seq)preserveStepReview(key,null);
    else if(latest){latest.revision=data.revision;latest.backedUp=preserveStepReview(key,latest);}
   }catch(error){
    const latest=stepReviewDrafts.get(key);
    if(latest){latest.conflict=error.code==='40001';latest.error=latest.conflict?'다른 화면에서 먼저 저장했습니다. 최신 기록을 확인해주세요.':'서버에 저장하지 못했습니다. 연결 후 다시 저장해주세요.';latest.backedUp=preserveStepReview(key,latest);}
    break;
   }
  }
 }).finally(()=>{stepReviewFlights.delete(key);notifyStepReviews();});
 stepReviewFlights.set(key,flight);notifyStepReviews();return flight;
}
async function waitForStepReviews(){await Promise.allSettled([...stepReviewFlights.values()]);}
async function reloadStepReview(sid,nid){
 if(!stepReviewAllowed())return;
 const owner=currentUser.id,key=stepReviewLocalKey(sid,nid);
 const {data,error}=await sb.from('helper_manual_reviews').select('symptom_id,status,note,content,revision,updated_at').eq('symptom_id',stepReviewKey(sid,nid)).maybeSingle();
 if(error)throw error;if(!stepReviewAllowed()||currentUser.id!==owner)return;
 if(data)manualReviewRows[stepReviewKey(sid,nid)]=reviewRecord(data);else delete manualReviewRows[stepReviewKey(sid,nid)];
 preserveStepReview(key,null);notifyStepReviews();
}
function appendStepReview(sid,nid,host){
 if(!stepReviewAllowed())return;
 const box=document.createElement('section');box.className='step-review';box.dataset.reviewSid=sid;box.dataset.reviewNid=nid;box.setAttribute('aria-label','STEP '+nid+' 점검');
 box.innerHTML='<div class="step-review-heading"><strong>단계 점검</strong><span class="step-review-badge"></span></div><div class="step-review-flags"></div><details><summary>메모 추가 · 선택</summary><textarea maxlength="500" rows="2" placeholder="어느 사진을 바꿀지 등 짧게 적어주세요" aria-label="단계 점검 메모"></textarea></details><p class="step-review-save" role="status"></p><button type="button" class="step-review-retry" hidden>다시 저장</button><button type="button" class="step-review-reload" hidden>최신 기록으로 되돌리기</button>';
 for(const flag of STEP_REVIEW_FLAGS){const b=document.createElement('button');b.type='button';b.textContent=flag;b.dataset.flag=flag;b.setAttribute('aria-pressed','false');b.onclick=()=>{const state=stepReviewState(sid,nid,getDiagramDraft(sid).tree.nodes[nid]);changeStepReview(sid,nid,{flags:flag==='픽스'&&state.changed?['픽스']:stepReviewToggle(state.flags,flag)});};box.querySelector('.step-review-flags').appendChild(b);}
 const memo=box.querySelector('textarea');memo.oninput=()=>changeStepReview(sid,nid,{note:memo.value});
 box.querySelector('details').ontoggle=()=>{if(diagramSelectedSid===sid)requestAnimationFrame(()=>drawFreeDiagramEdges(sid));};
 box.querySelector('.step-review-retry').onclick=()=>sendStepReview(sid,nid);
 box.querySelector('.step-review-reload').onclick=async()=>{
  if(!confirm('이 단계의 미저장 체크를 버리고 서버의 최신 점검 기록을 불러올까요? 안내 내용은 바뀌지 않습니다.'))return;
  try{await reloadStepReview(sid,nid);}catch{box.querySelector('.step-review-save').textContent='최신 기록을 불러오지 못했습니다. 체크는 유지됩니다.';}
 };
 box.refreshStepReview=()=>{
  const node=getDiagramDraft(sid).tree.nodes[nid];if(!node)return;
  const state=stepReviewState(sid,nid,node),pending=state.pending,busy=stepReviewFlights.has(stepReviewLocalKey(sid,nid));
  box.dataset.state=state.status;box.querySelector('.step-review-badge').textContent=state.status;
  box.querySelectorAll('[data-flag]').forEach(b=>{b.setAttribute('aria-pressed',String(state.flags.includes(b.dataset.flag)));b.disabled=!stepReviewAllowed();});
  if(document.activeElement!==memo)memo.value=state.note;
  box.querySelector('.step-review-save').textContent=pending?(pending.error+(pending.backedUp?' · 이 브라우저에 임시 보관됨':'')||(busy?'저장 중…':'미저장 · 다시 저장을 눌러주세요.')):state.changed?'픽스 이후 내용이 바뀌었습니다. 다시 확인해주세요.':stepReviewSaved(sid,nid)?'계정에 저장됨':'체크하면 자동 저장 · 미비 항목은 복수 선택';
  box.querySelector('.step-review-retry').hidden=!pending||busy||pending.conflict;
  box.querySelector('.step-review-reload').hidden=!pending||busy;
 };
 // Checking a stage must not start card dragging or trigger editor shortcuts.
 for(const event of ['pointerdown','click','keydown'])box.addEventListener(event,e=>e.stopPropagation());
 host.appendChild(box);box.refreshStepReview();return box;
}
function stepReviewEntries(){
 const manuals=new Map();
 for(const brand of ['photoism','snapism'])for(const device of diagramDevicesForBrand(brand))for(const sid of device.symptoms){
  if(!TREES[sid])continue;
  if(!manuals.has(sid))manuals.set(sid,{sid,device:device.name,brands:[]});
  manuals.get(sid).brands.push(brand==='photoism'?'포토이즘':'스내피즘');
 }
 const rows=[];
 for(const meta of manuals.values())for(const [nid,node] of Object.entries(getDiagramDraft(meta.sid).tree.nodes))rows.push({...meta,brands:[...new Set(meta.brands)],title:hotTopicLabel(meta.sid),nid,text:node.text||'',...stepReviewState(meta.sid,nid,node)});
 return rows;
}
function stepReviewMatches(row,filter,query,scope){
 return (!scope||row.sid===scope)&&(filter==='all'||filter==='issues'&&(row.status==='미비'||row.status==='재확인'||!!row.pending)||filter===row.status||row.flags.includes(filter))&&(!query||[row.title,row.device,row.sid,row.nid,row.text,row.note,...row.flags].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
}
function stepReviewCsv(rows){
 const cell=value=>{let str=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';};
 return '\ufeff'+[['브랜드','장비','조치 항목','항목 ID','단계','안내 내용','점검 상태','체크 항목','메모','저장 상태','마지막 저장 시각'],...rows.map(r=>[r.brands.join(' · '),r.device,r.title,r.sid,r.nid,r.text,r.status,r.flags.join(' · '),r.note,r.pending?'미저장':r.saved?'저장됨':'체크 전',r.updated])].map(row=>row.map(cell).join(',')).join('\r\n');
}
function focusRequestedStepReview(){
 if(!manualStepRequested||manualStepRequested.sid!==diagramSelectedSid)return;
 const {sid,nid}=manualStepRequested;manualStepRequested=null;
 diagramEditingList=true;diagramPhotoLibraryOpen=true;diagramPhotoFilter='all';diagramPhotoSearch='';refreshDiagramPhotoLibrary(sid);
 const row=[...document.querySelectorAll('.photo-library-row')].find(el=>el.dataset.photoNode===nid);
 row?.scrollIntoView({block:'start',behavior:'auto'});const first=row?.querySelector('.step-review button');first?.focus({preventScroll:true});
}
function openStepReviewReport(){
 if(!stepReviewAllowed())return;
 if(diagramSaving||mediaUploading){showToast('⏳','저장 또는 사진 업로드가 끝난 뒤 열어주세요.');return;}
 if(diagramSelectedSid&&document.getElementById('diagramCanvas'))captureDiagramDraft(diagramSelectedSid);
 const dialog=document.createElement('dialog');dialog.className='step-review-report';dialog.setAttribute('aria-labelledby','stepReviewReportTitle');
 dialog.innerHTML='<header><div><h2 id="stepReviewReportTitle">단계 점검 정리</h2><p>체크한 미비 사항을 모았습니다. 항목을 누르면 해당 단계로 이동합니다.</p></div><button type="button" data-close>닫기</button></header><p class="step-report-summary"></p><div class="step-report-controls"><label>범위 <select data-scope><option value="">모든 매뉴얼</option></select></label><label>점검 <select data-filter><option value="issues">미비 · 재확인 · 미저장</option><option value="all">전체 단계</option><option>미확인</option><option>픽스</option><option>설명 부족</option><option>사진 부족</option><option>사진 교체 필요</option><option>기타 확인</option><option>재확인</option></select></label><input type="search" aria-label="점검 정리 검색" placeholder="조치 항목 · 단계 · 메모 검색"><button type="button" data-export>현재 목록 내려받기 (CSV)</button></div><p class="step-report-count" role="status"></p><div class="step-report-list"></div>';
 const scope=dialog.querySelector('[data-scope]'),filter=dialog.querySelector('[data-filter]'),search=dialog.querySelector('input'),list=dialog.querySelector('.step-report-list');
 if(diagramSelectedSid&&TREES[diagramSelectedSid]){const option=document.createElement('option');option.value=diagramSelectedSid;option.textContent='현재 매뉴얼 · '+hotTopicLabel(diagramSelectedSid);scope.appendChild(option);}
 let visible=[];
 function refresh(){
  if(!stepReviewAllowed()){dialog.close();return;}
  const all=stepReviewEntries();visible=all.filter(row=>stepReviewMatches(row,filter.value,search.value.trim(),scope.value));
  const count=status=>all.filter(r=>r.status===status).length;
  dialog.querySelector('.step-report-summary').textContent='전체 '+all.length+'단계 · 미확인 '+count('미확인')+' · 미비 '+count('미비')+' · 픽스 '+count('픽스')+' · 재확인 '+count('재확인');
  dialog.querySelector('.step-report-count').textContent=visible.length+'개 단계'+(all.some(r=>r.pending)?' · 미저장 체크가 있습니다. 해당 단계에서 저장 상태를 확인해주세요.':'');
  list.replaceChildren();
  for(const row of visible){
   const item=document.createElement('article');item.className='step-report-item';const title=document.createElement('h3');title.textContent=row.title+' · STEP '+row.nid;
   const path=document.createElement('small');path.textContent=row.brands.join(' · ')+' / '+row.device;
   const text=document.createElement('p');text.className='step-report-excerpt';text.textContent=row.text;
   const status=document.createElement('strong');status.textContent=row.status+(row.flags.length?' · '+row.flags.join(' / '):'')+(row.pending?' · 미저장':'');
   const note=document.createElement('p');note.textContent=row.note?'메모: '+row.note:'';
   const go=document.createElement('button');go.type='button';go.textContent='해당 단계 열기';go.onclick=()=>{
    if(diagramSaving||mediaUploading)return;
    if(diagramSelectedSid&&document.getElementById('diagramCanvas'))captureDiagramDraft(diagramSelectedSid);
    manualStepRequested={sid:row.sid,nid:row.nid};dialog.close();
    if(diagramSelectedSid===row.sid&&document.getElementById('diagramCanvas'))focusRequestedStepReview();
    else{manualRequestedSid=row.sid;appState='diagramEditor';render();}
   };
   item.append(path,title,status,text,note,go);list.appendChild(item);
  }
  if(!visible.length){const empty=document.createElement('p');empty.textContent='해당하는 단계가 없습니다. 각 단계 박스에서 점검 항목을 체크해보세요.';list.appendChild(empty);}
 }
 scope.onchange=filter.onchange=refresh;search.oninput=refresh;
 dialog.querySelector('[data-export]').onclick=()=>{const url=URL.createObjectURL(new Blob([stepReviewCsv(visible)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='단계-점검-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 document.addEventListener('stepreviewchange',refresh);dialog.addEventListener('close',()=>{document.removeEventListener('stepreviewchange',refresh);dialog.remove();},{once:true});
 document.body.appendChild(dialog);refresh();dialog.showModal();
}
