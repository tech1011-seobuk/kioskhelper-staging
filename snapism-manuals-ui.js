let snapManualFilter='',snapManualReturn='snapismPicker',snapStage='devices',snapCategory='',snapEntry=null,snapStep=0;
function snapManualMatches(m,device){return !device||m.device===device||m.title.includes(device)||(['CX7600','DS620'].some(k=>device.includes(k))&&(device.includes(m.device)||m.device==='프린터'));}
const SNAP_DEVICE_ICONS={CX7600:'🖨️',DS620:'🖨️',모니터:'🖥️',PC:'💻',카드리더기:'💳',서비스코인:'🪙',키오스크:'🏢'};
function snapSections(id,indices){const m=SNAPISM_MANUALS.find(m=>m.id===String(id));return (indices||m.sections.map((_,i)=>i)).map(i=>m.sections[i]);}
function snapEntries(device,category){
 const entries=[];
 const add=(title,id,indices)=>{const sections=snapSections(id,indices);entries.push({editSource:`snap:${device}:${category}:${id}:${indices?indices.join(","):"all"}`,title,sections,cards:sections.flatMap(s=>s.cards),held:sections.find(s=>s.held)?.held});};
 const each=(id)=>snapSections(id).forEach((s,i)=>add(s.title.replace(/^[^가-힣A-Za-z]+/,''),id,[i]));
 if(category==='repair'){
  if(typeof catalogSymptoms==='function'){const key=device==='CX7600'?'CX7600 프린터 (포토카드)':device==='DS620'?'DS620 프린터 (스티커)':device;for(const sid of catalogSymptoms(key,'snapism').filter(id=>id.startsWith('CUS-')))entries.push({title:hotTopicLabel(sid),sid,cards:[]});}
  if(device==='CX7600'){for(let i=1;i<9;i++)add(snapSections(194833)[i].title.replace(/^◼\s*/,''),194833,[i]);for(const [title,ids]of [['하얀 이물질이 출력돼요',[0,1]],['먼지 모양이 출력돼요',[2,3]],['찍힘·구김이 보여요',[4,5]],['가로줄·세로줄이 보여요',[6,7,8]]])add(title,194882,ids);}
  if(device==='DS620')each(194826);
  if(device==='모니터')each(194891);
  if(device==='PC')each(194902);
  if(device==='카드리더기')add('카드 결제가 안 돼요',194908);
  if(device==='서비스코인')add('서비스코인 / 설정 버튼이 작동하지 않아요',194905,[0]);
  if(device==='키오스크')add('키오스크 전원이 들어오지 않아요',194906);
 }
 if(category==='replace'){
  if(device==='CX7600'||device==='DS620')add(device+' 프린터 교체',190279,[0,device==='CX7600'?2:1]);
  if(device==='모니터')add('모니터 교체',190267);
  if(device==='PC')add('PC 교체',190368);
  if(device==='카드리더기')add('카드단말기 교체',190369);
  if(device==='서비스코인')add('USB 단자부 교체',194905,[1]);
 }
 if(category==='care'){
  if(device==='CX7600'){add('RT필름 교체',287949,[0,2]);add('칼라리본 교체 · 원문 확인 중',287949,[1]);add('포토카드 보충',287947);add('클리닝 롤러 청소',287949,[3]);add('클리닝 카드 청소',287949,[4]);}
  if(device==='DS620')add('인화지·리본 교체',287948);
 }
 if(category==='info'){
  const map={CX7600:[4],DS620:[3],모니터:[5],PC:[6],카드리더기:[7],키오스크:[0,1,2,8]};
  if(map[device])add('장비 명칭과 연결 위치',144600,map[device]);
  if(device==='CX7600')add('프린터 에러코드 종류',194833,[0]);
 }
 return entries;
}
function openSnapManuals(device='',returnTo='snapismPicker'){
 snapManualFilter=['CX7600','DS620'].find(k=>device.includes(k))||device;snapManualReturn=returnTo;snapStage=device?'categories':'devices';snapEntry=null;snapStep=0;symptomSource='snapism';appState='snapManuals';render();
}
function appendSnapManualLink(host,device='',returnTo='snapismPicker'){
 if(device&&!SNAPISM_MANUALS.some(m=>snapManualMatches(m,device)))return;
 const box=document.createElement('div');box.className='helper-nav';const b=document.createElement('button');b.textContent=device?'📖 '+device+' 조치·교체 선택':'📋 장비별 조치·교체 선택';b.onclick=()=>openSnapManuals(device,returnTo);box.appendChild(b);host.appendChild(box);
}
// User-facing organization is separate from the original source/editor IDs.
function snapMenuEntries(device,category){
 const care=snapEntries(device,'care');
 return [...snapEntries(device,category),...care.filter(e=>category==='repair'?/청소/.test(e.title):category==='replace'&&!/청소/.test(e.title))].filter(e=>!e.held);
}
function snapDecorativeImage(item){
 try{return new URL(item.url).hostname==='cf.channel.io'&&new URL(item.url).pathname.startsWith('/asset/emoji/');}catch{return false;}
}
function snapStepText(text){
 return String(text||'').replace(/^\s*STEP\s*\d+(?:\s*\([^\n]*\))?[^\S\n]*(?:\n|$)/i,line=>{
  const subtitle=line.match(/\(([^\n]*)\)/)?.[1];return subtitle?subtitle+'\n':'';
 }).trim().replace(/\n{3,}/g,'\n\n');
}
function snapPlainNext(node){
 const option=node.options?.length===1?node.options[0]:null;
 return option?.next&&!option.end&&!option.jump&&!option.note&&!option.attachment?option.next:null;
}
function snapDisplayTree(source){
 const tree=JSON.parse(JSON.stringify(source)),incoming={};
 const cleanMedia=items=>{const seen=new Set();return (items||[]).filter(m=>{const key=JSON.stringify([m.kind,m.url||'',m.path||'',m.bucket||'']);if(snapDecorativeImage(m)||seen.has(key))return false;seen.add(key);return true;});};
 for(const node of Object.values(tree.nodes))for(const option of node.options||[])if(option.next)incoming[option.next]=(incoming[option.next]||0)+1;
 incoming[tree.start]=(incoming[tree.start]||0)+1;
 const signature=node=>JSON.stringify((node.media||[]).map(m=>[m.kind,m.url||'',m.path||'',m.bucket||'']));
 const reaches=(from,target,seen=new Set())=>{if(from===target)return true;if(seen.has(from))return false;seen.add(from);return (tree.nodes[from]?.options||[]).some(o=>o.next&&reaches(o.next,target,seen));};
 for(const [id,node] of Object.entries(tree.nodes)){
  if(!tree.nodes[id])continue;
  node.media=cleanMedia(node.media);
  node.snapParts=[snapStepText(node.text)];
  const visited=new Set([id]);
  while(true){
   const nextId=snapPlainNext(node),next=tree.nodes[nextId];
   if(!next||incoming[nextId]!==1||visited.has(nextId)||reaches(nextId,id)||node.attachment||next.attachment||next.options?.length!==1)break;
   next.media=cleanMedia(next.media);
   // Merge only consecutive identical photo sets along an unbranched edge.
   const samePhotos=node.media.some(m=>m.kind==='image')&&signature(node)===signature(next);
   const videoIntro=/^영상\s*매뉴얼$/.test(node.text.trim())&&node.media.length>0&&node.media.every(m=>m.kind==='link'&&!m.path&&/^https:\/\/www\.youtube\.com\/watch\?v=/.test(m.url));
   if(!samePhotos&&!videoIntro)break;
   visited.add(nextId);
   if(videoIntro){node.snapParts=[snapStepText(next.text)];node.media=[...node.media,...next.media];}
   else node.snapParts.push(snapStepText(next.text));
   node.text=node.snapParts.filter(Boolean).join('\n\n');node.options=next.options;
   delete tree.nodes[nextId];
  }
 }
 return tree;
}
let snapGuideSession=null;
function snapBeginGuide(entry){
 snapEntry=entry;snapStep=0;snapStage='guide';snapGuideSession=null;
}
function snapRecordResult(session,outcome){
 if(session.result)return false;
 session.result=outcome;
 logEvent('symptom_outcome',{brand:'snapism',device:session.device,symptomId:session.manualId,outcome,detail:session.detail});
 return true;
}
function snapEnsureStyles(){
 if(document.getElementById('snapGuideStyles'))return;
 const style=document.createElement('style');style.id='snapGuideStyles';style.textContent=`
 .snap-manual-screen{width:min(100%,760px);margin:0 auto;box-sizing:border-box;padding:16px 16px 40px}
 .snap-manual-screen .tool-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
 .snap-manual-screen .snap-guide-title{font-size:clamp(20px,4vw,28px);line-height:1.5;margin:24px 0 12px;overflow-wrap:anywhere}
 .snap-manual-screen .snap-guide-note{color:var(--muted);line-height:1.7;margin:0 0 24px}
 .snap-manual-screen .snap-guide-card{max-width:100%;width:100%;box-sizing:border-box;padding:22px;margin:18px 0;border:1px solid var(--border);border-radius:16px;background:var(--panel,#24262c);scroll-margin-top:150px}
 .snap-manual-screen .snap-guide-card h3{margin:0 0 16px;font-size:15px;color:var(--accent,#e2ed22)}
 .snap-manual-screen .snap-guide-copy{white-space:pre-wrap;font-size:15px;line-height:1.85;overflow-wrap:anywhere;margin:0 0 18px}
 .snap-manual-screen ol.snap-instructions{padding-left:24px;margin:0 0 20px}
 .snap-manual-screen ol.snap-instructions li{padding-left:4px;margin:0 0 16px}
 .snap-manual-screen .snap-guide-media img{display:block;width:auto!important;max-width:100%!important;height:auto!important;max-height:none!important;object-fit:contain;margin:14px auto!important;border-radius:10px}
 .snap-manual-screen .snap-guide-media a{display:block;max-width:100%}
 .snap-manual-screen .snap-guide-media{overflow:hidden}
 .snap-manual-screen .snap-guide-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
 .snap-manual-screen .snap-guide-actions button,.snap-manual-screen .snap-guide-actions a{min-height:48px;padding:12px 18px;flex:1;text-align:center;white-space:normal;border-radius:10px;font:inherit;font-weight:700;cursor:pointer}
 .snap-manual-screen .snap-primary{background:var(--accent,#e2ed22);color:#202020;border:1px solid var(--accent,#e2ed22)}
 .snap-manual-screen .snap-secondary{background:var(--panel,#292a30);color:var(--text,#fff);border:1px solid var(--border)}
 .snap-manual-screen .snap-guide-result{padding:20px;border:1px solid var(--border);border-radius:14px;margin-top:18px;line-height:1.8}
 .snap-manual-screen button:focus-visible,.snap-manual-screen a:focus-visible{outline:3px solid var(--accent,#e2ed22);outline-offset:3px}
 @media(max-width:560px){.snap-manual-screen{padding:12px 8px 32px}.snap-manual-screen .snap-guide-card{padding:16px}.snap-manual-screen .tool-card-grid{grid-template-columns:1fr}.snap-manual-screen .snap-guide-actions{flex-direction:column}.snap-manual-screen .snap-guide-actions>*{width:100%;box-sizing:border-box}}
 `;document.head.appendChild(style);
}
function appendSnapGuide(host,entry){
 const meta=editableManualSource(entry.editSource);if(!meta||meta.held)return;
 const tree=snapDisplayTree(diagnosisStore.rows[meta.id]?.tree||meta.tree);
 if(!snapGuideSession||snapGuideSession.source!==entry.editSource){
  snapGuideSession={source:entry.editSource,manualId:meta.id,device:snapManualFilter,detail:JSON.stringify({v:2,attempt:crypto.randomUUID()}),result:null};
  logEvent('symptom_click',{brand:'snapism',device:snapManualFilter,symptomId:meta.id,detail:snapGuideSession.detail});
 }
 const session=snapGuideSession,reader=document.createElement('section');reader.className='snap-guide-reader';host.appendChild(reader);
 const trail=[];
 const focus=element=>{element.focus({preventScroll:true});element.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
 const button=(parent,label,action,primary=false)=>{const b=document.createElement('button');b.type='button';b.className=primary?'snap-primary':'snap-secondary';b.textContent=label;b.onclick=action;parent.appendChild(b);return b;};
 function completion(parent,note=''){
  const box=document.createElement('div');box.className='snap-guide-result';box.dataset.snapResult='true';parent.appendChild(box);
  const title=document.createElement('strong');title.textContent=snapCategory==='replace'?'교체 후 정상 작동하나요?':'조치 후 문제가 해결됐나요?';box.appendChild(title);
  if(note){const p=document.createElement('p');p.className='snap-guide-copy';p.textContent=note;box.appendChild(p);}
  const actions=document.createElement('div');actions.className='snap-guide-actions';box.appendChild(actions);
  function finish(outcome){
   if(!snapRecordResult(session,outcome))return;
   actions.replaceChildren();title.textContent=outcome==='solved'?(snapCategory==='replace'?'교체 완료를 확인했어요.':'해결 여부를 기록했어요.'):'채널톡으로 도움을 요청해 주세요.';
   if(outcome==='escalate'){
    const link=document.createElement('a');link.className='snap-primary';link.href='https://cms.seobuk.kr/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='CMS에서 채널톡 문의하기 ↗';
    link.onclick=()=>logEvent('support_click',{brand:'snapism',device:session.device,symptomId:session.manualId,detail:session.detail});actions.appendChild(link);
   }
   button(actions,'다른 안내 보기',()=>{snapStage='list';render();});
  }
  if(session.result){title.textContent='결과가 기록된 안내입니다.';button(actions,'다른 안내 보기',()=>{snapStage='list';render();});return;}
  button(actions,snapCategory==='replace'?'교체 완료 · 정상 작동해요':'해결됐어요',()=>finish('solved'),true);
  button(actions,snapCategory==='replace'?'도움이 필요해요':'아직 안 돼요',()=>finish('escalate'));
 }
 function append(id,scroll=false){
  const node=tree.nodes[id];if(!node)return;
  const index=trail.length,card=document.createElement('article');card.className='snap-guide-card';card.tabIndex=-1;trail.push({id,card});
  const heading=document.createElement('h3');heading.textContent='STEP '+(index+1);card.appendChild(heading);
  const parts=(node.snapParts||[snapStepText(node.text)]).filter(Boolean);
  if(parts.length>1){const list=document.createElement('ol');list.className='snap-instructions';for(const part of parts){const li=document.createElement('li');li.className='snap-guide-copy';li.textContent=part;list.appendChild(li);}card.appendChild(list);}
  else if(parts.length){const text=document.createElement('p');text.className='snap-guide-copy';text.textContent=parts[0];card.appendChild(text);}
  if(node.attachment){const p=document.createElement('p');p.className='snap-guide-copy';p.textContent=node.attachment;card.appendChild(p);}
  const mediaItems=[];
  for(const item of node.media||[]){
   let url=null;try{if(item.kind==='link'&&!item.path)url=youtubeManualUrl(item.url);}catch{}
   if(url){const player=createManualVideo(url,item.name||'관련 영상');if(player)card.appendChild(player);}else mediaItems.push(item);
  }
  const media=document.createElement('div');media.className='snap-guide-media';media.innerHTML=renderDiagnosisMedia({...node,media:mediaItems});card.appendChild(media);
  const actions=document.createElement('div');actions.className='snap-guide-actions';card.appendChild(actions);
  const options=node.options||[],plainEnd=options.length===1&&options[0].end==='info'&&!options[0].next&&!options[0].jump;
  if(plainEnd){
   if(options[0].attachment){const p=document.createElement('p');p.textContent=options[0].attachment;card.appendChild(p);}
   completion(card,options[0].note||'');
  }else for(const option of options){
   const b=button(actions,options.length===1&&option.next?'다음 단계':option.label,()=>{
    trail.splice(index+1).forEach(item=>item.card.remove());card.querySelector('[data-snap-result]')?.remove();
    actions.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
    if(option.next)append(option.next,true);
    else if(option.jump){symptomSource='snapism';selectedDevice=snapManualFilter;startSymptom(option.jump);}
    else if(option.end){
     if(option.attachment){const p=document.createElement('p');p.textContent=option.attachment;card.appendChild(p);}
     const ending=resolvedEnding(option.end,meta.id,option.note);
     if(ending&&['as','escalate','solved'].includes(ending.endType)){
      const result=document.createElement('div');result.className='snap-guide-result';result.dataset.snapResult='true';result.textContent=ending.endNote||option.note||'안내를 확인했어요.';card.appendChild(result);
      snapRecordResult(session,ending.endType);
      const next=document.createElement('div');next.className='snap-guide-actions';result.appendChild(next);
      if(ending.endType==='escalate'){const link=document.createElement('a');link.href='https://cms.seobuk.kr/';link.target='_blank';link.rel='noopener noreferrer';link.className='snap-primary';link.textContent='CMS에서 채널톡 문의하기 ↗';link.onclick=()=>logEvent('support_click',{brand:'snapism',device:session.device,symptomId:meta.id,detail:session.detail});next.appendChild(link);}
      button(next,'다른 안내 보기',()=>{snapStage='list';render();});
     }else completion(card,option.note||ending?.endNote||'');
    }
   },options.length===1);
  }
  if(index>0)button(actions,'← 이전 단계',()=>{trail.splice(index).forEach(item=>item.card.remove());focus(trail.at(-1).card);});
  reader.appendChild(card);
  Promise.resolve(hydrateDiagnosisMedia()).then(()=>{
   for(const img of media.querySelectorAll('img')){
    img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',(img.alt||'사진')+' 확대 보기');
    img.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();img.click();}};
   }
  });
  if(scroll)focus(card);
 }
 append(tree.start);
}

function renderSnapManuals(){
 snapEnsureStyles();
 const area=document.getElementById('chatArea');area.innerHTML='';
 const wrap=document.createElement('div');wrap.className='snap-manual-screen';area.appendChild(wrap);
 const back=document.createElement('button');back.className='opt-btn';back.type='button';back.textContent=snapStage==='guide'?'← 안내 목록':'← 이전 단계';
 back.onclick=()=>{if(snapStage==='guide')snapStage='list';else if(snapStage==='list')snapStage='categories';else if(snapStage==='categories'){appState=snapManualReturn;render();return;}else{appState='snapismPicker';render();return;}render();};wrap.appendChild(back);
 if(snapStage!=='guide'){const heading=document.createElement('h1');heading.className='snap-guide-title';heading.textContent=snapStage==='devices'?'장비 선택':snapManualFilter;wrap.appendChild(heading);}
 const categories=[['repair','🔧','고장 조치','문제가 생긴 증상을 선택해 주세요.'],['replace','🔄','교체 방법','장비 또는 소모품 교체 방법을 확인해요.']];
 const label=categories.find(c=>c[0]===snapCategory)?.[2]||'';
 document.getElementById('breadcrumb').textContent='스내피즘'+(snapStage==='devices'?'':' · '+snapManualFilter)+(snapStage==='list'||snapStage==='guide'?' · '+label:'');
 if(snapStage==='guide'){
  const title=document.createElement('h1');title.className='snap-guide-title';title.textContent=snapEntry.title;wrap.appendChild(title);
  if(snapEntry.held){const note=document.createElement('p');note.textContent=snapEntry.held;wrap.appendChild(note);return;}
  const note=document.createElement('p');note.className='snap-guide-note';note.textContent='사진과 설명을 확인한 뒤 순서대로 진행해 주세요.';wrap.appendChild(note);
  appendSnapGuide(wrap,snapEntry);return;
 }
 const sub=document.createElement('p');sub.className='snap-guide-note';sub.textContent=snapStage==='categories'?'어떤 도움이 필요하세요?':snapStage==='list'?(snapCategory==='repair'?'확인할 증상을 선택해 주세요.':'교체할 항목을 선택해 주세요.'):'확인할 장비를 선택해 주세요.';wrap.appendChild(sub);
 const grid=document.createElement('div');grid.className=snapStage==='list'?'symptoms-grid':'tool-card-grid';wrap.appendChild(grid);
 function card(title,icon,desc,click){const b=document.createElement('button');b.type='button';b.className=snapStage==='list'?'symptom-card':'tool-card';b.innerHTML=snapStage==='list'?'<span>'+escapeHtml(title)+'</span>':'<span class="tc-icon" aria-hidden="true">'+icon+'</span><div class="tc-title">'+escapeHtml(title)+'</div><div class="tc-desc">'+escapeHtml(desc)+'</div>';b.onclick=click;grid.appendChild(b);}
 if(snapStage==='devices')for(const [name,icon]of Object.entries(SNAP_DEVICE_ICONS))card(name,icon,'고장 조치 · 교체 방법',()=>{snapManualFilter=name;snapStage='categories';render();});
 if(snapStage==='categories')for(const [key,icon,title,desc]of categories)if(snapMenuEntries(snapManualFilter,key).length)card(title,icon,desc,()=>{snapCategory=key;snapStage='list';render();});
 if(snapStage==='list')for(const entry of snapMenuEntries(snapManualFilter,snapCategory))card(entry.title,'','',()=>{if(entry.sid){selectedDevice=snapManualFilter;startSymptom(entry.sid);return;}snapBeginGuide(entry);render();});
}
