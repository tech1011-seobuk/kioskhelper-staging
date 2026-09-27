let endingGuides={};
let endingGuidesReady=false;
function endingDefinition(id){
 const row=endingGuides[id],base=END_META[id];
 return row|| (base?{id,label:base.label,body:base.desc,result_type:id,device_notes:{},revision:0}:null);
}
function endingChoices(){return [...new Set([...Object.keys(END_META),...Object.keys(endingGuides)])].map(endingDefinition).filter(Boolean);}
function endingDevice(sid){return DEVICES.find(d=>d.symptoms.includes(sid))?.name||selectedDevice||'';}
function resolvedEnding(id,sid,note){
 const item=endingDefinition(id);if(!item)return null;
 const extra=item.device_notes[endingDevice(sid)]||'';
 return {endType:item.result_type,endTitle:item.label,endNote:[note||item.body,extra].filter(Boolean).join('\n\n')};
}
async function loadEndingGuides(){
 if(!sb||!currentUser)return false;
 const owner=currentUser.id,key='endingGuides:'+SUPABASE_URL;
 try{
  const {data,error}=await sb.from('helper_ending_guides').select('id,label,body,result_type,device_notes,revision').order('id');
  if(error)throw error;if(currentUser?.id!==owner)return false;
  const rows={};for(const r of data||[]){validateEndingGuide(r);rows[r.id]=r;}
  endingGuides=rows;endingGuidesReady=true;
  try{localStorage.setItem(key,JSON.stringify(rows));}catch{}
  return true;
 }catch{
  endingGuidesReady=false;
  try{const rows=JSON.parse(localStorage.getItem(key)||'{}');Object.values(rows).forEach(validateEndingGuide);endingGuides=rows;}catch{}
  return false;
 }
}
function validateEndingGuide(row){
 if(!row||!['solved','escalate','as','info'].includes(row.result_type)||typeof row.label!=='string'||!row.label.trim()||row.label.length>120||typeof row.body!=='string'||!row.body.trim()||row.body.length>10000||!row.device_notes||Array.isArray(row.device_notes)||typeof row.device_notes!=='object'||Object.entries(row.device_notes).some(([key,v])=>key.length>120||typeof v!=='string'||v.length>5000))throw Error('종료 안내의 제목·내용·장비별 추가 설명을 확인해주세요.');
}
function openEndingGuideManager(){
 if(APP_ENV!=='staging'||currentUser?.role!=='admin'||diagramSaving||mediaUploading)return;
 if(document.getElementById('endingGuideDialog'))return;
 const dialog=document.createElement('dialog');dialog.id='endingGuideDialog';
 dialog.style.cssText='width:min(680px,92vw);max-height:90vh;overflow:auto;border:1px solid var(--border);border-radius:16px;background:var(--panel,#24262c);color:var(--text,#fff);padding:24px';
 dialog.innerHTML='<form method="dialog"><button style="float:right">닫기</button></form><h2>종료 안내 관리</h2><p>공통 안내와 장비별 추가 설명을 관리합니다. 새 안내는 결과 유형을 지정한 뒤 선택지에 연결하세요.</p><label>편집할 안내<select id="endingGuideSelect"></select></label><button id="endingGuideNew">＋ 새 종료 안내</button><div id="endingGuideForm"></div>';
 document.body.appendChild(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
 let current=null,notes={},device='',dirty=false,busy=false;
 const select=dialog.querySelector('#endingGuideSelect'),form=dialog.querySelector('#endingGuideForm');
 function options(id){select.innerHTML=endingChoices().map(r=>'<option value="'+r.id+'">'+escapeHtml(r.label)+'</option>').join('');if(id)select.value=id;}
 function draw(id){
  current=endingDefinition(id)||{id:'custom_'+crypto.randomUUID().replaceAll('-',''),label:'',body:'',result_type:'info',device_notes:{},revision:0};notes={...current.device_notes};dirty=false;device='';
  if(!current.revision&&!END_META[current.id]){const option=document.createElement('option');option.value=current.id;option.textContent='새 종료 안내 (미저장)';select.appendChild(option);select.value=current.id;}
  form.innerHTML='<label>안내 이름<input id="endingLabel" maxlength="120"></label><label>결과 유형<select id="endingResult">'+Object.entries(END_META).map(([k,v])=>'<option value="'+k+'">'+escapeHtml(v.label)+'</option>').join('')+'</select></label><p>결과 유형은 해결 통계와 문의 버튼 동작에 사용됩니다. A/S 필요에는 문의 링크가 붙지 않습니다.</p><label>공통 안내 내용<textarea id="endingBody" rows="4" maxlength="10000"></textarea></label><label>추가 설명을 넣을 장비<select id="endingDevice"><option value="">장비 선택</option>'+[...new Set(DEVICES.map(d=>d.name))].map(n=>'<option>'+escapeHtml(n)+'</option>').join('')+'</select></label><textarea id="endingExtra" rows="3" maxlength="5000" placeholder="이 장비에서만 마지막 안내 아래에 덧붙일 내용" disabled></textarea><p>장비별 추가 설명은 해당 장비의 모든 증상에 적용됩니다. 선택지에 별도 안내가 있으면 공통 안내 대신 표시하며, 장비 설명은 함께 붙습니다.</p><button id="endingGuideSave">종료 안내 저장·적용</button><p id="endingGuideStatus" role="status"></p>';
  form.querySelector('#endingLabel').value=current.label;form.querySelector('#endingBody').value=current.body;form.querySelector('#endingResult').value=current.result_type;form.querySelector('#endingResult').disabled=!!END_META[current.id]||current.revision>0;
  form.oninput=()=>dirty=true;
  form.querySelector('#endingDevice').onchange=e=>{if(device)notes[device]=form.querySelector('#endingExtra').value;device=e.target.value;form.querySelector('#endingExtra').disabled=!device;form.querySelector('#endingExtra').value=notes[device]||'';};
  form.querySelector('#endingGuideSave').onclick=save;
 }
 async function save(){
  if(busy)return;if(device)notes[device]=form.querySelector('#endingExtra').value;
  const row={id:current.id,label:form.querySelector('#endingLabel').value.trim(),body:form.querySelector('#endingBody').value.trim(),result_type:form.querySelector('#endingResult').value,device_notes:notes};
  const status=form.querySelector('#endingGuideStatus');
  try{validateEndingGuide(row);}catch(e){status.textContent=e.message;return;}
  busy=true;dialog.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=true);const owner=currentUser.id;
  try{
   const {data,error}=await sb.rpc('save_ending_guide',{p_id:row.id,p_label:row.label,p_body:row.body,p_result_type:row.result_type,p_device_notes:row.device_notes,p_expected_revision:current.revision});if(error)throw error;
   if(currentUser?.id!==owner){dialog.close();return;}validateEndingGuide(data);endingGuides[data.id]=data;current=data;dirty=false;options(data.id);
   status.textContent='저장 완료 · 테스트 사이트에 적용했습니다. 다이어그램 선택지에서 이 안내를 고를 수 있어요.';
   if(diagramSelectedSid&&document.getElementById('diagramCanvas')){captureDiagramDraft(diagramSelectedSid);openDiagram(diagramSelectedSid);}
  }catch(e){status.textContent='저장하지 못했습니다. 입력 내용은 유지됩니다. '+(e.message||'연결을 확인해주세요.');}
  finally{busy=false;dialog.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=false);form.querySelector('#endingExtra').disabled=!device;form.querySelector('#endingResult').disabled=!!END_META[current.id]||current.revision>0;}
 }
 select.onchange=()=>{if(dirty&&!confirm('아직 저장하지 않은 종료 안내를 닫고 다른 안내를 볼까요?')){select.value=current.id;return;}draw(select.value);};
 dialog.querySelector('#endingGuideNew').onclick=()=>{if(dirty&&!confirm('미저장 내용을 닫고 새 안내를 만들까요?'))return;options();draw(null);};
 dialog.addEventListener('cancel',e=>{if(busy||(dirty&&!confirm('미저장 내용을 닫을까요?')))e.preventDefault();});
 dialog.querySelector('form').onsubmit=e=>{if(busy||(dirty&&!confirm('미저장 내용을 닫을까요?')))e.preventDefault();};
 dialog.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopPropagation();save();}});
 options();draw('solved');
}
