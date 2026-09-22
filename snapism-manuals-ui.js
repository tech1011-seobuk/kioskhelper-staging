let snapManualFilter='',snapManualReturn='snapismPicker',snapStage='devices',snapCategory='',snapEntry=null,snapStep=0;
function snapManualMatches(m,device){return !device||m.device===device||m.title.includes(device)||(['CX7600','DS620'].some(k=>device.includes(k))&&(device.includes(m.device)||m.device==='프린터'));}
const SNAP_DEVICE_ICONS={CX7600:'🖨️',DS620:'🖨️',모니터:'🖥️',PC:'💻',카드리더기:'💳',서비스코인:'🪙',키오스크:'🏢'};
function snapSections(id,indices){const m=SNAPISM_MANUALS.find(m=>m.id===String(id));return (indices||m.sections.map((_,i)=>i)).map(i=>m.sections[i]);}
function snapEntries(device,category){
 const entries=[];
 const add=(title,id,indices)=>{const sections=snapSections(id,indices);entries.push({title,sections,cards:sections.flatMap(s=>s.cards),held:sections.find(s=>s.held)?.held});};
 const each=(id)=>snapSections(id).forEach((s,i)=>add(s.title.replace(/^[^가-힣A-Za-z]+/,''),id,[i]));
 if(category==='repair'){
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
function renderSnapManuals(){
 const area=document.getElementById('chatArea');area.innerHTML='';
 const wrap=document.createElement('div');wrap.className=snapStage==='guide'?'chat-inner':'hub-screen';area.appendChild(wrap);
 const back=document.createElement('button');back.className='opt-btn';back.textContent='← 이전';back.onclick=()=>{if(snapStage==='guide')snapStage='list';else if(snapStage==='list')snapStage='categories';else if(snapStage==='categories') {appState=snapManualReturn;render();return;}else {appState='snapismPicker';render();return;}render();};wrap.appendChild(back);
 const heading=document.createElement('div');heading.className='hub-title';heading.textContent=snapStage==='devices'?'장비를 선택해주세요':(SNAP_DEVICE_ICONS[snapManualFilter]||'')+' '+snapManualFilter;wrap.appendChild(heading);
 const categories=[['repair','🔧','고장 조치','증상을 골라 단계별로 확인해요.'],['replace','🔄','교체 방법','장비 교체 과정을 안내해요.'],['care','🧹','소모품 교체·청소','소모품 보충과 장비 관리를 안내해요.'],['info','📖','장비 명칭·위치','부품과 케이블 위치를 확인해요.']];
 const label=categories.find(c=>c[0]===snapCategory)?.[2]||'';
 document.getElementById('breadcrumb').textContent='스내피즘'+(snapStage==='devices'?'':' · '+snapManualFilter)+(snapStage==='list'||snapStage==='guide'?' · '+label:'');
 if(snapStage==='guide'){
  const title=document.createElement('h2');title.textContent=snapEntry.title;wrap.appendChild(title);
  if(snapEntry.held){const p=document.createElement('p');p.textContent=snapEntry.held;wrap.appendChild(p);return;}
  const videos=[...new Set(snapEntry.cards.flatMap(c=>c.videos))];for(const url of videos){const b=document.createElement('button');b.className='symptom-video-entry';b.textContent='🎬 전체 조치 과정 영상 매뉴얼 보기';b.onclick=()=>openSymptomVideo(url);wrap.appendChild(b);}
  snapEntry.cards.slice(0,snapStep+1).forEach((c,i)=>{const bubble=document.createElement('div');bubble.className='bubble bot';bubble.style.cssText='margin:20px 0;max-width:100%;box-sizing:border-box';bubble.innerHTML='<div class="step-tag">STEP '+(i+1)+' / '+snapEntry.cards.length+'</div><p style="white-space:pre-wrap">'+escapeHtml(c.text)+'</p>';for(const url of c.images){const img=document.createElement('img');img.src=url;img.alt=snapEntry.title+' 참고 사진';img.loading='lazy';img.style.cssText='width:100%;height:auto;display:block;margin-top:12px;border-radius:10px';bubble.appendChild(img);}wrap.appendChild(bubble);});
  const actions=document.createElement('div');actions.className='end-actions';const b=document.createElement('button');b.textContent=snapStep<snapEntry.cards.length-1?'다음':'안내 확인 완료';b.onclick=()=>{if(snapStep<snapEntry.cards.length-1){snapStep++;renderSnapManuals();[...area.querySelectorAll('.bubble')].at(-1)?.scrollIntoView({block:'start',behavior:'smooth'});}else{snapStage='list';render();}};actions.appendChild(b);wrap.appendChild(actions);return;
 }
 const sub=document.createElement('div');sub.className='hub-sub';sub.textContent=snapStage==='categories'?'무엇을 도와드릴까요?':snapStage==='list'?(snapCategory==='repair'?'어떤 증상인가요?':'확인할 항목을 선택해주세요'):'장비를 고르면 조치·교체 항목을 선택할 수 있어요.';wrap.appendChild(sub);
 const grid=document.createElement('div');grid.className=snapStage==='list'?'symptoms-grid':'tool-card-grid';wrap.appendChild(grid);
 function card(title,icon,desc,click){const b=document.createElement('button');b.className=snapStage==='list'?'symptom-card':'tool-card';b.innerHTML=snapStage==='list'?'<span>'+escapeHtml(title)+'</span>':'<span class="tc-icon">'+icon+'</span><div class="tc-title">'+escapeHtml(title)+'</div><div class="tc-desc">'+escapeHtml(desc)+'</div>';b.onclick=click;grid.appendChild(b);}
 if(snapStage==='devices')for(const [name,icon]of Object.entries(SNAP_DEVICE_ICONS))card(name,icon,'조치·교체 항목 선택',()=>{snapManualFilter=name;snapStage='categories';render();});
 if(snapStage==='categories')for(const [key,icon,title,desc]of categories)if(snapEntries(snapManualFilter,key).length)card(title,icon,desc,()=>{snapCategory=key;snapStage='list';render();});
 if(snapStage==='list')for(const entry of snapEntries(snapManualFilter,snapCategory))card(entry.title,'','',()=>{snapEntry=entry;snapStep=0;snapStage='guide';render();});
}
