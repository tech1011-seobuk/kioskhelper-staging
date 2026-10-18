/* Search published user guides only. Never include editor drafts or account data. */
const GUIDE_SEARCH_ALIASES=[
 ['에스라이트','스트로브','플래시','후레쉬','flash'],['핫슈','hot shoe','hotshoe'],
 ['냉각팬','냉각펜','쿨링팬'],['컴퓨터','피씨','본체','pc'],['테더','테더선','테더링'],
 ['지폐투입기','지폐인식기','지폐리더기'],['카드리더기','카드단말기','카드결제기'],
 ['안됨','안돼요','안되요','안돼','안되','안됩니다','작동불가','작동 안함'],
 ['발광','불빛','불이'],['안들어옴','안들어와요','안들어와','안들어옴','안켜져요','안켜짐'],
 ['미출력','안나와요','안나와','안나옴'],['교체','바꾸기','교환'],['청소','클리닝'],
 ['포토이즘','photoism'],['스내피즘','스냅이즘','snapism']
];
function guideSearchNormalize(value){
 let text=String(value||'').normalize('NFKC').toLowerCase().replace(/에러\s*(?:코드)?|오류\s*코드|error\s*(?:code)?/gi,' 오류 ');
 const aliases=GUIDE_SEARCH_ALIASES.flatMap(group=>group.map(alias=>[alias,group[0]])).sort((a,b)=>b[0].length-a[0].length);
 for(const [alias,word] of aliases)text=text.split(alias).join(word);
 return text.replace(/[^a-z0-9가-힣]/g,'');
}
function guideSearchTerms(value){
 const text=String(value||'').trim().replace(/에러\s*(?:코드)?|오류\s*코드|error\s*(?:code)?/gi,' 오류 ').replace(/([가-힣])([0-9])/g,'$1 $2');
 return [...new Set(text.split(/\s+/).map(guideSearchNormalize).filter(Boolean))];
}
function rankGuideSearch(entries,query,brand='all'){
 const terms=guideSearchTerms(query),whole=guideSearchNormalize(query);
 if(whole.length<2)return [];
 return entries.filter(e=>brand==='all'||e.brand===brand).map(entry=>{
  const title=guideSearchNormalize(entry.title),code=guideSearchNormalize(entry.code),device=guideSearchNormalize(entry.device),body=guideSearchNormalize(entry.body),brandText=guideSearchNormalize(entry.brand==='photoism'?'포토이즘':'스내피즘');
  const hay=title+code+device+body+brandText;
  if(!terms.every(term=>hay.includes(term)))return null;
  let score=(code&&code===whole?1000:0)+(title===whole?600:title.includes(whole)?250:0)+(device===whole?100:0);
  for(const term of terms)score+=(title.includes(term)?60:0)+(code.includes(term)?90:0)+(device.includes(term)?35:0)+(brandText.includes(term)?15:0);
  return {entry,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title,'ko')).map(x=>x.entry);
}
function guideSearchBody(tree){return Object.values(tree?.nodes||{}).map(n=>[n.text,...(n.options||[]).map(o=>o.label)].join(' ')).join(' ');}
function buildGuideSearchIndex(){
 const entries=[],seen=new Set(),add=entry=>{if(!seen.has(entry.id)){seen.add(entry.id);entries.push(entry);}};
 for(const device of DEVICES){
  if(device.name==='서비스코인')continue;
  for(const sid of catalogSymptoms(device.name,'photoism')){
   if(!TREES[sid]||sid.startsWith('SNAP-'))continue;
   add({id:'photoism:'+sid,brand:'photoism',device:device.name,code:sid,title:hotTopicLabel(sid),kind:'고장 조치',body:guideSearchBody(TREES[sid]),route:'symptom',sid});
  }
 }
 for(const sid of catalogSymptoms('CMS','snapism'))if(TREES[sid])add({id:'snapism:'+sid,brand:'snapism',device:'CMS',code:sid,title:hotTopicLabel(sid),kind:'고장 조치',body:guideSearchBody(TREES[sid]),route:'symptom',sid});
 for(const device of ['CX7600','DS620','모니터','PC','카드리더기','서비스코인','키오스크']){
  for(const category of ['repair','replace','care','info'])for(const [index,item]of snapEntries(device,category).entries()){
   if(item.held||(!item.cards.length&&!item.sid))continue;
   add({id:'snapism:'+device+':'+category+':'+index,brand:'snapism',device,code:item.sid||'',title:item.title,kind:{repair:'고장 조치',replace:'교체 방법',care:'소모품·청소',info:'장비 안내'}[category],body:item.sid?guideSearchBody(TREES[item.sid]):(typeof editableManualBody==='function'?editableManualBody(item.editSource,item.cards.map(c=>c.text).join(' ')):item.cards.map(c=>c.text).join(' ')),route:'snap',category,index});
  }
 }
 for(const [key,guides]of Object.entries(REPLACEMENT_GUIDES))for(const [variant,guide]of guides.entries()){
  const [device,model]=key.split(':'),camera=CAMERA_MODELS.find(m=>m.id===model),printer=PRINTER_MODELS.find(m=>m.id===model);
  const name=camera?.sub||printer?.label||guide.label||device;
  add({id:'replace:'+key+':'+variant,brand:'photoism',device,code:'',title:name+(name.includes('교체')?'':' 교체'),kind:'교체 방법',body:typeof editableManualBody==='function'?editableManualBody('replace:'+key+':'+variant,[guide.preparation,guide.after,...guide.steps.flat()].filter(Boolean).join(' ')):[guide.preparation,guide.after,...guide.steps.flat()].filter(Boolean).join(' '),route:'replace',key,model,variant});
 }
 for(const model of CAMERA_MODELS)for(const action of ['basic','color'])add({id:'camera:'+model.id+':'+action,brand:'photoism',device:'카메라',code:'',title:model.sub+' '+(action==='basic'?'기본 설정':'색감 조정'),kind:'설정 방법',body:typeof editableManualBody==='function'?editableManualBody('camera:'+model.id+':'+action,action==='basic'?'카메라 기본세팅 설정':'화이트밸런스 색감 밝기 조정 세팅'):(action==='basic'?'카메라 기본세팅 설정':'화이트밸런스 색감 밝기 조정 세팅'),route:'camera',model:model.id,action});
 return entries;
}
let guideSearchQuery='',guideSearchBrand='all',guideSearchReturn='hub',guideSearchVariant=null;
function takeGuideSearchVariant(key){const result=guideSearchVariant?.key===key?guideSearchVariant.variant:0;guideSearchVariant=null;return result;}
function openGuideSearch(){
 if(!currentUser||['login','storeSelect','diagramEditor'].includes(appState))return;
 if(appState!=='guideSearch')guideSearchReturn=['adminDashboard','diagramEditor','accountCreate','cmsApprovals'].includes(appState)?'hub':appState;
 appState='guideSearch';render();
}
function updateGuideSearchEntry(){
 let button=document.getElementById('guideSearchButton');
 if(!button){button=document.createElement('button');button.id='guideSearchButton';button.type='button';button.className='guide-search-top';button.textContent='검색';button.setAttribute('aria-label','조치 안내 검색');button.onclick=openGuideSearch;document.querySelector('.topbar-right').prepend(button);}
 button.hidden=!currentUser||['login','storeSelect','diagramEditor'].includes(appState);
 const area=document.getElementById('chatArea');
 if(currentUser&&['hub','picker','snapismPicker'].includes(appState)&&!area.querySelector('.guide-search-launch')){
  const launch=document.createElement('button');launch.type='button';launch.className='guide-search-launch';launch.innerHTML='<span class="guide-search-symbol" aria-hidden="true">⌕</span><span><strong>어떤 도움이 필요하세요?</strong><span>증상·장비·오류코드 검색</span></span><span aria-hidden="true">→</span>';launch.onclick=openGuideSearch;area.prepend(launch);
 }
}
async function openGuideSearchResult(entry){
 if(!currentUser)return;
 symptomSource=entry.brand;selectedDevice=entry.device;
 if(entry.route==='symptom'){await startSymptom(entry.sid);return;}
 path=[];if(typeof helperAttempt!=='undefined')helperAttempt=null;
 if(entry.route==='snap'){
  const item=snapEntries(entry.device,entry.category)[entry.index];
  if(!item||item.held)return;
  if(item.sid){await startSymptom(item.sid);return;}
  snapManualFilter=entry.device;snapManualReturn='guideSearch';snapCategory=entry.category;snapEntry=item;snapStep=0;snapStage='guide';appState='snapManuals';
 }else if(entry.route==='replace'){
  selectedEquipReplaceDevice=entry.device;selectedCameraModel=entry.device==='카메라'?entry.model:null;selectedPrinterModel=entry.device==='프린터'?entry.model:null;guideSearchVariant={key:entry.key,variant:entry.variant};appState='equipReplaceDetail';
 }else if(entry.route==='camera'){
  selectedCameraModel=entry.model;pendingCameraAction=null;
  if(entry.action==='basic'){goToCameraBasicSetup();updateGuideSearchEntry();return;}
  goToCameraColorGuideContent();updateGuideSearchEntry();return;
 }
 logEvent('device_click',{brand:entry.brand,device:entry.device,detail:entry.title});render();
}
function renderGuideSearchScreen(){
 if(!currentUser){appState='login';render();return;}
 const area=document.getElementById('chatArea'),wrap=document.createElement('section');wrap.className='guide-search-screen';
 wrap.innerHTML='<div class="guide-search-heading"><div><h1>조치 안내 검색</h1><p>장비를 하나씩 누르지 않고 바로 찾아보세요.</p></div><button type="button" data-close>닫기</button></div><form class="guide-search-form" role="search"><label for="guideSearchInput">증상·장비·오류코드</label><div><input id="guideSearchInput" type="search" maxlength="100" autocomplete="off" enterkeyhint="search" placeholder="예: 발광 안됨, 핫슈 교체, 에러 70"><button type="button" data-clear aria-label="검색어 지우기">지우기</button></div></form><div class="guide-search-filters" role="group" aria-label="브랜드 선택"></div><p class="guide-search-status" role="status" aria-live="polite"></p><div class="guide-search-results"></div>';
 area.replaceChildren(wrap);document.getElementById('breadcrumb').textContent='조치 안내 검색';
 wrap.querySelector('[data-close]').onclick=()=>{appState=guideSearchReturn==='guideSearch'?'hub':guideSearchReturn;render();};
 const input=wrap.querySelector('input'),results=wrap.querySelector('.guide-search-results'),status=wrap.querySelector('[role=status]');input.value=guideSearchQuery;
 const entries=buildGuideSearchIndex();let limit=24,timer=null,opening=false;
 const filterHost=wrap.querySelector('.guide-search-filters');
 for(const [value,label]of [['all','전체'],['photoism','포토이즘'],['snapism','스내피즘']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.brand=value;button.onclick=()=>{guideSearchBrand=value;limit=24;draw();};filterHost.appendChild(button);}
 function draw(){
  if(!wrap.isConnected)return;results.replaceChildren();filterHost.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.brand===guideSearchBrand)));
  const q=input.value.trim();guideSearchQuery=q;
  if(guideSearchNormalize(q).length<2){status.textContent=q?'두 글자 이상 입력해주세요.':'증상명, 장비명, 오류코드, 교체·청소 방법을 검색할 수 있어요.';const examples=document.createElement('div');examples.className='guide-search-examples';for(const text of ['발광 안됨','핫슈 교체','리본 오류','터치','에러 70']){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{input.value=text;draw();};examples.appendChild(b);}results.appendChild(examples);return;}
  const found=rankGuideSearch(entries,q,guideSearchBrand);status.textContent=found.length?found.length+'개 안내를 찾았어요.':"‘"+q+"’에 맞는 안내가 없어요.";
  if(!found.length){const p=document.createElement('p');p.className='guide-search-empty';p.textContent='장비명이나 짧은 증상으로 다시 검색해보세요. 예: 프린터, 용지, 핫슈';results.appendChild(p);return;}
  for(const entry of found.slice(0,limit)){
   const button=document.createElement('button');button.type='button';button.className='guide-search-result';
   const meta=document.createElement('span');meta.className='guide-search-meta';meta.textContent=(entry.brand==='photoism'?'포토이즘':'스내피즘')+' · '+entry.device+' · '+entry.kind;
   const title=document.createElement('strong');title.textContent=entry.title;
   const code=document.createElement('span');code.className='guide-search-code';code.textContent=(entry.code?entry.code+' · ':'')+(entry.route==='symptom'?'첫 단계부터 보기':'안내 바로 보기')+' →';
   button.append(meta,title,code);button.onclick=async()=>{if(opening)return;opening=true;button.disabled=true;try{await openGuideSearchResult(entry);}finally{opening=false;if(button.isConnected)button.disabled=false;}};results.appendChild(button);
  }
  if(found.length>limit){const more=document.createElement('button');more.type='button';more.className='guide-search-more';more.textContent='결과 더 보기 ('+Math.min(limit,found.length)+' / '+found.length+')';more.onclick=()=>{limit+=24;draw();};results.appendChild(more);}
 }
 input.oninput=()=>{clearTimeout(timer);limit=24;timer=setTimeout(draw,100);};
 input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();wrap.querySelector('[data-close]').click();}};
 wrap.querySelector('form').onsubmit=e=>{e.preventDefault();clearTimeout(timer);draw();input.blur();};
 wrap.querySelector('[data-clear]').onclick=()=>{input.value='';clearTimeout(timer);draw();input.focus({preventScroll:true});};
 draw();input.focus({preventScroll:true});
}
