let snapManualFilter='',snapManualReturn='snapismPicker';
function snapManualMatches(m,device){return !device||m.device===device||m.title.includes(device)||(['CX7600','DS620'].some(k=>device.includes(k))&&(device.includes(m.device)||m.device==='프린터'));}
function openSnapManuals(device='',returnTo='snapismPicker'){
 snapManualFilter=device;snapManualReturn=returnTo;appState='snapManuals';render();
}
function appendSnapManualLink(host,device='',returnTo='snapismPicker'){
 if(device&&!SNAPISM_MANUALS.some(m=>snapManualMatches(m,device)))return;
 const box=document.createElement('div');box.className='helper-nav';
 const b=document.createElement('button');b.textContent='📖 스내피즘 '+(device?device+' ':'')+'사진·영상 매뉴얼';b.onclick=()=>openSnapManuals(device,returnTo);box.appendChild(b);host.appendChild(box);
}
function renderSnapManuals(){
 const host=helperShell('📖 스내피즘 장비 매뉴얼','장비 조치·교체 자료를 골라 단계별로 확인해 주세요.');
 host.innerHTML='';
 const back=document.createElement('button');back.textContent='← 이전 화면';back.onclick=()=>{appState=snapManualReturn;render();};host.appendChild(back);
 const controls=document.createElement('div');controls.className='helper-card';controls.innerHTML='<label>매뉴얼 검색<input type="search" placeholder="장비명 또는 오류 코드"></label><label>장비<select><option value="">전체 장비</option>'+['CX7600','DS620','프린터','모니터','PC','카드리더기','서비스코인','키오스크'].map(x=>'<option>'+x+'</option>').join('')+'</select></label>';host.appendChild(controls);
 const select=controls.querySelector('select');select.value=['CX7600','DS620'].find(k=>snapManualFilter.includes(k))||snapManualFilter;
 const list=document.createElement('div');host.appendChild(list);
 function draw(){
  list.innerHTML='';const query=controls.querySelector('input').value.trim().toLowerCase();
  for(const m of SNAPISM_MANUALS.filter(m=>snapManualMatches(m,select.value))){
   const sections=m.sections.filter(s=>!query||[m.title,s.title,...s.cards.map(c=>c.text)].join(' ').toLowerCase().includes(query));if(!sections.length)continue;
   const card=document.createElement('section');card.className='helper-card';card.innerHTML='<h2>'+escapeHtml(m.title)+'</h2>'+(m.notice?'<p class="helper-small">'+escapeHtml(m.notice)+'</p>':'');
   sections.forEach(s=>{
    const details=document.createElement('details');details.style.margin='16px 0';details.innerHTML='<summary>'+escapeHtml(s.title)+(s.held?' · 확인 중':'')+'</summary>';card.appendChild(details);
    if(s.held){const p=document.createElement('p');p.textContent=s.held;details.appendChild(p);return;}
    let position=0;const body=document.createElement('div');details.appendChild(body);
    const show=()=>{
     const c=s.cards[position];body.innerHTML='<p class="helper-small">'+(position+1)+' / '+s.cards.length+' 카드</p><p class="helper-body">'+escapeHtml(c.text)+'</p>';
     c.images.forEach(url=>{const img=document.createElement('img');img.src=url;img.alt=s.title+' 참고 사진';img.loading='lazy';img.style.cssText='display:block;width:100%;height:auto;object-fit:contain;margin:12px auto;border-radius:8px';img.onerror=()=>{img.replaceWith(Object.assign(document.createElement('p'),{textContent:'사진을 불러오지 못했어요. 잠시 후 다시 열어 주세요.'}));};body.appendChild(img);});
     for(const url of c.videos){const b=document.createElement('button');b.textContent='🎬 영상 매뉴얼 보기';b.onclick=()=>openSymptomVideo(url);body.appendChild(b);}
     const actions=document.createElement('div');actions.className='helper-actions';
     for(const [label,offset]of [['이전',-1],['다음',1]]){const b=document.createElement('button');b.textContent=label;b.disabled=position+offset<0||position+offset>=s.cards.length;b.onclick=()=>{position+=offset;show();details.scrollIntoView({block:'start',behavior:'smooth'});};actions.appendChild(b);}body.appendChild(actions);
    };let loaded=false;details.ontoggle=()=>{if(details.open&&!loaded){loaded=true;show();}};
   });list.appendChild(card);
  }if(!list.children.length)list.textContent='해당하는 매뉴얼이 없어요.';
 }
 controls.querySelector('input').oninput=draw;select.onchange=draw;draw();
}
