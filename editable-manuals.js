/* Production manual snapshots, edited through the existing revisioned diagnosis editor. */
function editableManual(id){return typeof EDITABLE_MANUALS==='undefined'?null:EDITABLE_MANUALS.find(m=>m.id===id)||null;}
function editableManualSource(source){return typeof EDITABLE_MANUALS==='undefined'?null:EDITABLE_MANUALS.find(m=>m.source===source)||null;}
function editableManualLabel(id){const m=editableManual(id);return m?({repair:'고장 조치',replace:'교체',care:'소모품·청소',info:'장비 안내',setup:'설정'}[m.category]+' · '+m.title+(m.held&&!m.title.includes('확인 중')?' · 확인 중':'')):'';}
function manualEditorSymptoms(device,brand){return [...new Set([...catalogSymptoms(device,brand),...(typeof EDITABLE_MANUALS==='undefined'?[]:EDITABLE_MANUALS.filter(m=>m.device===device&&m.brand===brand).map(m=>m.id))])];}
function editableManualChanged(source){
 const m=editableManualSource(source),row=m&&diagnosisStore.rows[m.id];
 return !!(m&&!m.held&&row&&!sameDiagnosis(row.tree,m.tree));
}
function editableManualBody(source,fallback){const m=editableManualSource(source);return m&&diagnosisStore.rows[m.id]?guideSearchBody(diagnosisStore.rows[m.id].tree):fallback;}
function appendEditableManual(host,id,onComplete,{videoHost=null}={}){
 const meta=editableManual(id);if(!meta)return;
 const tree=cloneDiagnosis(diagnosisStore.rows[id]?.tree||meta.tree);
 const section=document.createElement('section');section.className='editable-manual-reader';host.appendChild(section);
 if(meta.held){const note=document.createElement('p');note.textContent=meta.held;section.appendChild(note);return;}
 const trail=[];
 function append(nid){
  const node=tree.nodes[nid];if(!node)return;
  const card=document.createElement('article');card.className='bubble bot';card.style.cssText='margin:20px 0;max-width:100%;box-sizing:border-box';
  const index=trail.length;trail.push(card);
  const heading=document.createElement('h3');heading.textContent='STEP '+(index+1);heading.tabIndex=-1;card.appendChild(heading);
  const text=document.createElement('p');text.style.whiteSpace='pre-wrap';text.textContent=node.text;card.appendChild(text);
  if(node.attachment){const extra=document.createElement('p');extra.textContent=node.attachment;card.appendChild(extra);}
  // Camera replacement keeps its saved opening videos above the step text.
  // Only the display copy is filtered; saved content and editor drafts stay intact.
  const openingVideos=index===0&&videoHost?(node.media||[]).filter(item=>{
   if(item.kind!=='link'||item.path)return false;
   try{return !!youtubeManualUrl(item.url);}catch{return false;}
  }):[];
  for(const item of openingVideos)videoHost.appendChild(createManualVideo(item.url,item.name));
  const displayNode=openingVideos.length?{...node,media:node.media.filter(item=>!openingVideos.includes(item))}:node;
  const media=document.createElement('div');media.innerHTML=renderDiagnosisMedia(displayNode);card.appendChild(media);
  if(index===0&&!videoHost)appendSymptomVideoButtons(card,tree);
  const options=document.createElement('div');options.className='options-wrap';card.appendChild(options);
  for(const option of node.options){
   const button=document.createElement('button');button.type='button';button.className='opt-btn';button.textContent=option.label;
   button.onclick=()=>{
    trail.splice(index+1).forEach(el=>el.remove());section.querySelector('[data-manual-end]')?.remove();
    options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    if(option.next)append(option.next);
    else if(option.jump){symptomSource=meta.brand;selectedDevice=meta.device;startSymptom(option.jump);}
    else {
     const ending=document.createElement('div');ending.dataset.manualEnd='true';ending.className='end-actions';
     const result=resolvedEnding(option.end,id,option.note);const message=document.createElement('p');
     message.textContent=option.note||result?.desc||END_META[option.end]?.desc||'안내를 모두 확인했습니다.';ending.appendChild(message);
     if(option.attachment){const p=document.createElement('p');p.textContent=option.attachment;ending.appendChild(p);}
     if(onComplete)onComplete(ending);section.appendChild(ending);
    }
   };options.appendChild(button);
  }
  section.appendChild(card);hydrateDiagnosisMedia();
 }
 append(tree.start);
}
function appendEditableCameraActions(host,model){
 const section=document.createElement('section');section.className='camera-after-replacement';
 const title=document.createElement('h3');title.textContent='교체가 끝났다면, 설정을 이어서 진행해 주세요';section.appendChild(title);
 const note=document.createElement('p');note.textContent=model.toUpperCase()+' 기종의 기본세팅을 먼저 진행한 뒤, 색감을 조정해 주세요.';section.appendChild(note);
 const actions=document.createElement('div');actions.className='camera-after-actions';section.appendChild(actions);
 for(const [number,label,desc,action]of [['1','기본세팅 하기','교체한 카메라의 기본 설정을 맞춰요.',goToCameraBasicSetup],['2','색감 조정하기','기본세팅 후 촬영 색감을 맞춰요.',goToCameraColorGuideContent]]){
  const b=document.createElement('button');b.type='button';b.className='camera-after-action';
  const order=document.createElement('span');order.className='camera-after-order';order.textContent=number;b.appendChild(order);
  const copy=document.createElement('span');const name=document.createElement('strong');name.textContent=label;copy.appendChild(name);
  const detail=document.createElement('span');detail.textContent=desc;copy.appendChild(detail);b.appendChild(copy);
  b.onclick=()=>{selectedCameraModel=model;action();};actions.appendChild(b);
 }
 host.appendChild(section);
}
