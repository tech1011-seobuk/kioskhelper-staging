/* Embedded into index.html by sync-community.cjs. No independent script request. */
let helperAttempt = null;
let helperNoticeOwner = null;
let helperNoticeBusy = false;
let helperNoticeDialog = null;
const helperRatingDone = new Set();
const helperStatuses = ['접수','검토 중','반영 예정','반영 완료','보류'];
const helperKinds = ['안내','업데이트 예정','업데이트 완료','점검'];
const helperCategories = ['조치 안내','사진·영상','사용 불편','기타'];

function helperInit(){
  if(document.getElementById('helperCommunityStyle')) return;
  const style=document.createElement('style');style.id='helperCommunityStyle';
  style.textContent=`
    .helper-nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:16px 0}
    .helper-panel{max-width:900px;width:100%;margin:0 auto;padding:20px;box-sizing:border-box}
    .helper-card{background:rgba(var(--glass-rgb),.78);border:1px solid var(--border);border-radius:16px;padding:20px;margin:14px 0;overflow-wrap:anywhere}
    .helper-card h2,.helper-card h3{margin:0 0 12px}.helper-body{white-space:pre-wrap;line-height:1.7}
    .helper-small{font-size:12px;color:var(--muted);line-height:1.6}.helper-card label{display:block;margin:12px 0 6px}
    .helper-card input:not([type=checkbox]),.helper-card select,.helper-card textarea{display:block;box-sizing:border-box;width:100%;padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--bg,#202126);color:var(--text,#eee);font:inherit}
    .helper-card textarea{min-height:120px;resize:vertical}.helper-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
    .helper-panel button,.helper-nav button,.helper-rating button,.helper-dialog button{padding:11px 16px;border:1px solid var(--border);border-radius:10px;background:rgba(var(--glass-rgb),.95);color:var(--text,#eee);font:inherit;cursor:pointer}
    .helper-primary{background:var(--accent,#dbef35)!important;color:#111!important;font-weight:700!important}
    .helper-panel button:disabled{opacity:.55;cursor:wait}.helper-error{color:#ffb2a8;white-space:pre-wrap}
    .helper-dialog{max-width:560px;width:calc(100% - 32px);box-sizing:border-box;border:1px solid #555;border-radius:18px;background:#22252a;color:#fff;padding:24px;max-height:85vh;overflow:auto}
    .helper-dialog::backdrop{background:#0009}.helper-rating{margin:18px 0;padding:18px;border:1px solid var(--border);border-radius:14px}.helper-rating button{margin:4px;min-width:44px}
    .helper-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.helper-kpis .helper-card{margin:0;word-break:keep-all}.helper-filters select{background:#24272d;color:#eee;padding:10px 14px;border:1px solid var(--border);border-radius:9px;font:inherit}.helper-value{font-size:27px;font-weight:800;margin:10px 0}
    .helper-card summary{cursor:pointer;font-weight:700}.helper-filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.helper-filters select{width:auto}
    @media(max-width:540px){.helper-panel{padding:12px}.helper-card{padding:16px}.helper-kpis{grid-template-columns:1fr 1fr}.helper-value{font-size:23px}}
  `;document.head.appendChild(style);
}
function helperNavigation(){
  helperInit();
  let nav=document.getElementById('helperNav');
  if(!nav){
    nav=document.createElement('div');nav.id='helperNav';nav.className='helper-nav';
    document.getElementById('chatArea').before(nav);
    for(const [page,label] of [['announcements','📢 공지사항'],['suggestions','💡 개선 제안']]){
      const btn=document.createElement('button');btn.textContent=label;
      btn.onclick=()=>{appState=page;render();};nav.appendChild(btn);
    }
  }
  nav.hidden=!currentUser;nav.style.display=currentUser?'flex':'none';
  if(!currentUser){helperNoticeOwner=null;helperAttempt=null;helperNoticeDialog?.close();helperNoticeDialog?.remove();helperNoticeDialog=null;}
}
function helperErrorText(){return '저장소에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요. 입력 내용은 유지됩니다.';}
async function helperQuery(query){
  if(!sb || !navigator.onLine)throw new Error('offline');
  const result=await query;if(result.error)throw result.error;return result.data;
}
function helperOptions(values,selected){return values.map(v=>'<option'+(v===selected?' selected':'')+'>'+escapeHtml(v)+'</option>').join('');}
function helperStamp(value){return new Date(value).toLocaleString('ko-KR');}
function helperOwnerValid(owner,page){return currentUser?.id===owner && appState===page;}
function helperShell(title,subtitle){
  document.getElementById('breadcrumb').textContent=title;
  const area=document.getElementById('chatArea');area.innerHTML='<section class="helper-panel"><button id="helperHome">← 홈</button><h1>'+title+'</h1><p class="helper-small">'+subtitle+'</p><div id="helperContent">불러오는 중...</div></section>';
  document.getElementById('helperHome').onclick=()=>{appState='hub';render();};return document.getElementById('helperContent');
}
async function renderAnnouncementsScreen(){
  if(!currentUser)return;
  const owner=currentUser.id,admin=currentUser.role==='admin';
  const content=helperShell('📢 공지사항','업데이트 일정과 변경 사항을 확인하세요.');
  try{
    const rows=await helperQuery(sb.from('helper_announcements').select('*').order('created_at',{ascending:false}).limit(100));
    if(!helperOwnerValid(owner,'announcements'))return;
    content.innerHTML='';
    if(admin){const add=document.createElement('button');add.textContent='＋ 공지 작성';add.className='helper-primary';add.onclick=()=>helperNoticeEditor(content);content.appendChild(add);}
    const list=document.createElement('div');content.appendChild(list);
    if(!rows.length)list.innerHTML='<div class="helper-card">등록된 공지가 없어요.</div>';
    rows.forEach(row=>{
      const item=document.createElement('article');item.className='helper-card';
      const state=!row.published?'초안':new Date(row.starts_at)>new Date()?'예약':row.ends_at&&new Date(row.ends_at)<=new Date()?'종료':'게시 중';
      item.innerHTML='<p class="helper-small">'+escapeHtml(row.kind)+' · '+helperStamp(row.starts_at)+(admin?' · '+state:'')+(row.important?' · 중요':'')+'</p><h2>'+escapeHtml(row.title)+'</h2><div class="helper-body">'+escapeHtml(row.body)+'</div>';
      if(admin){const edit=document.createElement('button');edit.textContent='수정';edit.className='helper-actions';edit.onclick=()=>helperNoticeEditor(content,row);item.appendChild(edit);}
      list.appendChild(item);
    });
    if(rows.length===100){const hint=document.createElement('p');hint.textContent='최근 공지 100개를 표시합니다.';list.appendChild(hint);}
  }catch{content.innerHTML='<p class="helper-error">공지를 불러오지 못했어요.</p><button id="helperRetry">다시 시도</button>';content.querySelector('button').onclick=renderAnnouncementsScreen;}
}
function helperLocalTime(value){const date=new Date(value||Date.now());return new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function helperNoticeEditor(content,row={}){
  const owner=currentUser.id;
  content.querySelector('form')?.remove();
  const form=document.createElement('form');form.className='helper-card';
  form.innerHTML='<h2>공지 '+(row.id?'수정':'작성')+'</h2><label>유형<select name="kind">'+helperOptions(helperKinds,row.kind)+'</select></label><label>제목<input name="title" maxlength="120" required></label><label>내용<textarea name="body" maxlength="10000" required></textarea></label><label>게시 시작<input type="datetime-local" name="start" required></label><label>게시 종료 (선택)<input type="datetime-local" name="end"></label><label><input type="checkbox" name="important"> 로그인 후 팝업으로 알리기</label><label><input type="checkbox" name="published"> 게시하기 (선택하지 않으면 초안)</label><p class="helper-small">게시 시작 전에는 예약 상태입니다. 팝업은 이 매장 계정이 확인하면 다시 뜨지 않습니다.</p><p class="helper-error" role="status"></p><div class="helper-actions"><button class="helper-primary" type="submit">저장</button><button type="button" data-preview>팝업 미리보기</button><button type="button" data-cancel>취소</button></div>';
  form.elements.title.value=row.title||'';form.elements.body.value=row.body||'';
  form.elements.start.value=helperLocalTime(row.starts_at);form.elements.end.value=row.ends_at?helperLocalTime(row.ends_at):'';
  form.elements.important.checked=!!row.important;form.elements.published.checked=!!row.published;
  form.querySelector('[data-preview]').onclick=()=>{
    const preview=document.createElement('dialog');preview.className='helper-dialog';
    preview.setAttribute('aria-label','공지 팝업 미리보기');
    preview.innerHTML='<p class="helper-small">미리보기 · 아직 게시되지 않았어요</p><h2>'+escapeHtml(form.elements.title.value||'공지 제목')+'</h2><div class="helper-body">'+escapeHtml(form.elements.body.value||'공지 내용')+'</div><div class="helper-actions"><button>닫기</button></div>';
    document.body.appendChild(preview);preview.querySelector('button').onclick=()=>preview.close();preview.addEventListener('close',()=>preview.remove());preview.showModal();
  };
  form.querySelector('[data-cancel]').onclick=()=>form.remove();content.prepend(form);form.elements.title.focus();
  form.onsubmit=async e=>{
    e.preventDefault();const msg=form.querySelector('[role=status]'),button=form.querySelector('[type=submit]');
    const payload={title:form.elements.title.value.trim(),body:form.elements.body.value.trim(),kind:form.elements.kind.value,starts_at:new Date(form.elements.start.value).toISOString(),ends_at:form.elements.end.value?new Date(form.elements.end.value).toISOString():null,important:form.elements.important.checked,published:form.elements.published.checked};
    if(!payload.title||!payload.body){msg.textContent='제목과 내용을 입력해주세요.';return;}
    if(payload.ends_at&&payload.ends_at<=payload.starts_at){msg.textContent='게시 종료는 시작보다 늦어야 해요.';return;}
    button.disabled=true;msg.textContent='저장 중...';
    try{await helperQuery(row.id?sb.from('helper_announcements').update(payload).eq('id',row.id).select('id').single():sb.from('helper_announcements').insert(payload).select('id').single());if(helperOwnerValid(owner,'announcements'))renderAnnouncementsScreen();}
    catch{msg.textContent=helperErrorText();button.disabled=false;}
  };
}
async function helperCheckNotices(){
  if(!currentUser||helperNoticeBusy||helperNoticeOwner===currentUser.id||appState!=='hub')return;
  const owner=currentUser.id;helperNoticeBusy=true;
  try{
    const now=new Date().toISOString();
    const notices=await helperQuery(sb.from('helper_announcements').select('*').eq('published',true).eq('important',true).lte('starts_at',now).or('ends_at.is.null,ends_at.gt.'+now).order('starts_at',{ascending:false}).limit(30));
    const reads=notices.length?await helperQuery(sb.from('helper_notice_reads').select('notice_id').eq('user_id',owner).in('notice_id',notices.map(x=>x.id))):[];
    if(!helperOwnerValid(owner,'hub'))return;
    const seen=new Set(reads.map(x=>x.notice_id));const row=notices.find(x=>!seen.has(x.id));helperNoticeOwner=owner;
    if(!row)return;
    const dialog=document.createElement('dialog');dialog.className='helper-dialog';helperNoticeDialog=dialog;
    dialog.setAttribute('aria-labelledby','helperNoticeTitle');
    dialog.innerHTML='<p>'+escapeHtml(row.kind)+'</p><h2 id="helperNoticeTitle">'+escapeHtml(row.title)+'</h2><div class="helper-body">'+escapeHtml(row.body)+'</div><p role="status"></p><div class="helper-actions"><button data-later>나중에 보기</button><button class="helper-primary" data-read>확인했어요</button></div>';
    document.body.appendChild(dialog);dialog.showModal();
    dialog.querySelector('[data-later]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();if(helperNoticeDialog===dialog)helperNoticeDialog=null;});
    dialog.querySelector('[data-read]').onclick=async e=>{
      const button=e.currentTarget;button.disabled=true;
      try{await helperQuery(sb.from('helper_notice_reads').insert({notice_id:row.id}));dialog.close();}
      catch(err){if(err.code==='23505')dialog.close();else{dialog.querySelector('[role=status]').textContent='확인 기록을 저장하지 못했어요. 다시 시도해주세요.';button.disabled=false;}}
    };
  }catch{/* Archive remains accessible with explicit retry; do not interrupt diagnosis. */}
  finally{helperNoticeBusy=false;}
}
async function renderSuggestionsScreen(){
  if(!currentUser)return;
  const owner=currentUser.id,admin=currentUser.role==='admin';
  const content=helperShell('💡 개선 제안','더 나은 조치 안내를 위한 의견을 남겨주세요. 긴급 장애는 조치 안내 후 채널톡으로 문의해주세요.');
  content.innerHTML='<form class="helper-card"><h2>의견 남기기</h2><label>구분<select name="category">'+helperOptions(helperCategories)+'</select></label><label>내용<textarea name="body" maxlength="3000" placeholder="불편했던 점이나 필요한 사진·영상을 알려주세요." required></textarea></label><p class="helper-small">비밀번호나 고객 개인정보는 적지 말아주세요. 작성한 의견은 이 계정과 관리자만 볼 수 있어요.</p><p role="status"></p><button class="helper-primary" type="submit">제안 보내기</button></form><h2>'+(admin?'접수된 개선 제안':'내 계정의 개선 제안')+'</h2><div id="helperSuggestionList">불러오는 중...</div>';
  const form=content.querySelector('form');let requestId=crypto.randomUUID();
  form.onsubmit=async e=>{
    e.preventDefault();const body=form.elements.body.value.trim();if(!body)return;
    const btn=form.querySelector('button'),status=form.querySelector('[role=status]');btn.disabled=true;status.textContent='저장 중...';
    try{
      const result=await sb.from('helper_suggestions').insert({id:requestId,category:form.elements.category.value,body,context:[symptomSource,selectedDevice,helperAttempt?.symptomId].filter(Boolean).join(' · ').slice(0,300)}).select('id').single();
      if(result.error&&result.error.code!=='23505')throw result.error;
      if(!helperOwnerValid(owner,'suggestions'))return;
      form.elements.body.value='';status.textContent='접수했어요. 아래 목록에서 답변과 처리 상태를 확인할 수 있어요.';requestId=crypto.randomUUID();await loadList();
    }catch{status.textContent=helperErrorText();}finally{btn.disabled=false;}
  };
  let loaded=0;
  async function loadList(more=false){
    const list=content.querySelector('#helperSuggestionList');if(!more)loaded=0;
    try{
      let query=sb.from('helper_suggestions').select('*').order('created_at',{ascending:false}).order('id').range(loaded,loaded+49);if(!admin)query=query.eq('user_id',owner);
      const rows=await helperQuery(query);if(!helperOwnerValid(owner,'suggestions'))return;
      list.querySelector('[data-more]')?.remove();if(!more)list.innerHTML='';
      if(!rows.length&&!loaded)list.textContent='아직 등록된 제안이 없어요.';
      rows.forEach(row=>{
        const card=document.createElement('article');card.className='helper-card';
        card.innerHTML='<p class="helper-small">'+helperStamp(row.created_at)+' · '+escapeHtml(row.category)+' · '+escapeHtml(row.status)+'</p><div class="helper-body">'+escapeHtml(row.body)+'</div>'+(row.context?'<p class="helper-small">'+escapeHtml(row.context)+'</p>':'')+(row.reply?'<div class="helper-card helper-body"><strong>TX팀 답변</strong><br>'+escapeHtml(row.reply)+'</div>':'');
        if(admin){
          const editor=document.createElement('form');editor.innerHTML='<label>처리 상태<select name="status">'+helperOptions(helperStatuses,row.status)+'</select></label><label>답변<textarea name="reply" maxlength="3000"></textarea></label><p role="status"></p><button type="submit">답변·상태 저장</button>';editor.elements.reply.value=row.reply;
          editor.onsubmit=async e=>{e.preventDefault();const btn=editor.querySelector('button'),msg=editor.querySelector('[role=status]');btn.disabled=true;try{await helperQuery(sb.from('helper_suggestions').update({status:editor.elements.status.value,reply:editor.elements.reply.value.trim()}).eq('id',row.id).select('id').single());msg.textContent='저장했어요.';}catch{msg.textContent=helperErrorText();}finally{btn.disabled=false;}};card.appendChild(editor);
        }
        list.appendChild(card);
      });loaded+=rows.length;
      if(rows.length===50){const moreBtn=document.createElement('button');moreBtn.dataset.more='';moreBtn.textContent='더 보기';moreBtn.onclick=()=>{moreBtn.disabled=true;loadList(true);};list.appendChild(moreBtn);}
    }catch{let retry=list.querySelector('[data-more]');if(retry){retry.disabled=false;retry.textContent='불러오기 실패 · 다시 시도';}else{list.innerHTML='<p class="helper-error">제안 목록을 불러오지 못했어요.</p><button>다시 시도</button>';list.querySelector('button').onclick=()=>loadList();}}
  }
  await loadList();
}
function helperStartAttempt(symptomId){helperAttempt={id:crypto.randomUUID(),symptomId,startedAt:Date.now()};}
function helperAttemptDetail(){return helperAttempt?JSON.stringify({v:2,attempt:helperAttempt.id}):null;}
function helperAddRating(container){
  if(!helperAttempt||!currentUser)return;
  const attempt=helperAttempt.id,owner=currentUser.id;
  const box=document.createElement('section');box.className='helper-rating';container.appendChild(box);
  if(helperRatingDone.has(attempt)){box.textContent='안내 만족도를 남겨주셔서 감사합니다!';return;}
  box.innerHTML='<div>이번 조치 안내는 얼마나 만족스러웠나요? (선택)</div><p class="helper-small">1점 매우 불만족 · 5점 매우 만족</p><div class="helper-actions"></div><p role="status"></p>';
  for(let score=1;score<=5;score++){
    const button=document.createElement('button');button.textContent=score+'점';button.setAttribute('aria-label','안내 만족도 '+score+'점');box.querySelector('.helper-actions').appendChild(button);
    button.onclick=async()=>{
      box.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await helperQuery(sb.from('helper_ratings').insert({attempt_id:attempt,score}));if(currentUser?.id!==owner)return;helperRatingDone.add(attempt);box.textContent='안내 만족도를 남겨주셔서 감사합니다!';}
      catch(err){if(err.code==='23505'){helperRatingDone.add(attempt);box.textContent='이 조치의 만족도는 이미 접수됐어요.';}else{box.querySelector('[role=status]').textContent='저장하지 못했어요. 다시 눌러주세요.';box.querySelectorAll('button').forEach(b=>b.disabled=false);}}
    };
  }
}
// Only v2 attempts have reliable start/outcome pairing. Legacy records remain in details.
function helperMetrics(events,ratings,since=0){
  const attempts=new Map();
  for(const e of [...events].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))){
    let meta;try{meta=JSON.parse(e.detail);}catch{continue;}
    if(meta?.v!==2||!meta.attempt||!e.user_id)continue;
    const key=e.user_id+'|'+meta.attempt;
    if(e.event_type==='symptom_click'&&!attempts.has(key))attempts.set(key,{id:meta.attempt,user:e.user_id,start:+new Date(e.created_at),symptom:e.symptom_id,outcome:null});
    const item=attempts.get(key);if(!item)continue;
    if(e.event_type==='symptom_outcome'){item.outcome=e.outcome;item.end=+new Date(e.created_at);}
    if(e.event_type==='support_click')item.clicked=true;
  }
  const rows=[...attempts.values()].filter(x=>x.start>=since),valid=new Set(rows.map(x=>x.user+'|'+x.id));
  const scores=ratings.filter(x=>valid.has(x.user_id+'|'+x.attempt_id));
  const solved=rows.filter(x=>x.outcome==='solved'),escalate=rows.filter(x=>x.outcome==='escalate'),as=rows.filter(x=>x.outcome==='as'),info=rows.filter(x=>x.outcome==='info');
  const completed=solved.length+escalate.length+as.length;
  const durations=solved.map(x=>x.end-x.start).filter(x=>x>=0&&x<=3600000).sort((a,b)=>a-b);
  const median=durations.length?(durations[Math.floor((durations.length-1)/2)]+durations[Math.floor(durations.length/2)])/2:null;
  return {rows,solved:solved.length,escalate:escalate.length,as:as.length,info:info.length,pending:rows.filter(x=>!x.outcome).length,completed,rate:completed?Math.round(solved.length/completed*100):null,clicks:rows.filter(x=>x.clicked).length,scores: scores.length,score:scores.length?scores.reduce((s,r)=>s+r.score,0)/scores.length:null,median,durationCount:durations.length};
}
async function helperRenderPerformance(events,profiles){
  const area=document.getElementById('chatArea'),owner=currentUser.id;
  const host=document.createElement('section');host.className='helper-panel';host.id='helperPerformance';
  area.prepend(host);let ratings=[],ratingFailed=false,suggestions=[];
  try{[ratings,suggestions]=await Promise.all([loadAllAdminRows('helper_ratings'),loadAllAdminRows('helper_suggestions')]);}catch{ratingFailed=true;}
  if(!helperOwnerValid(owner,'adminDashboard')||!host.isConnected)return;
  const renderStats=(days='30')=>{
    const since=days==='all'?0:Date.now()-Number(days)*86400000,m=helperMetrics(events,ratings,since);
    const kpi=(name,value,note)=>'<article class="helper-card"><div>'+name+'</div><div class="helper-value">'+value+'</div><div class="helper-small">'+note+'</div></article>';
    host.innerHTML='<h1>📊 해결 성과와 점주 만족도</h1><p class="helper-small">목표: 점주가 더 쉽게 해결하고, 필요한 상담은 빠르게 연결하기</p><div class="helper-filters"><label for="helperPeriod">집계 기간</label><select id="helperPeriod">'+[['7','최근 7일'],['30','최근 30일'],['90','최근 90일'],['all','전체']].map(([v,l])=>'<option value="'+v+'"'+(v===days?' selected':'')+'>'+l+'</option>').join('')+'</select></div><div class="helper-kpis" style="margin-top:16px">'+
      kpi('자가 해결률',m.rate===null?'—':m.rate+'%',m.solved+'건 해결 / 결과 확인 '+m.completed+'건 · 단순 안내 완료 제외')+
      kpi('조치 안내 만족도',ratingFailed?'조회 실패':m.score===null?'—':m.score.toFixed(1)+' / 5',m.scores+'건 응답 · 점주 안내 만족도')+
      kpi('해결 소요시간 중앙값',m.median===null?'—':Math.round(m.median/60000)+'분',m.durationCount+'건 · 1시간 이내 완료 기록 기준')+
      kpi('상담 안내 / A/S 안내',m.escalate+' / '+m.as,'A/S 안내를 실패로 단정하지 않아요.')+
      kpi('CMS 문의 이동',m.clicks+'건','버튼 클릭 기준 · 실제 상담 접수와 다름')+
      kpi('진행 중·결과 미응답',m.pending+'건','조치 시작 '+m.rows.length+'건 · 안내 완료 '+m.info+'건')+'</div><p class="helper-small">새 측정 방식 적용 이후 시작한 조치만 집계합니다. 결과를 다시 선택하면 마지막 결과로 갱신해요. 응답 없는 조치를 성공으로 계산하지 않아요. 실제 채널톡 인입 감소율과 고객 만족도는 별도 데이터 연동이 필요해요.</p>';
    const issues=new Map();m.rows.filter(x=>x.outcome==='escalate').forEach(x=>issues.set(x.symptom,(issues.get(x.symptom)||0)+1));
    const issueList=[...issues].sort((a,b)=>b[1]-a[1]).slice(0,5);
    const section=document.createElement('div');section.className='helper-card';section.innerHTML='<h2>우선 보완할 조치 안내</h2>'+(issueList.length?issueList.map(([id,n])=>'<p>'+escapeHtml(SYMPTOM_LABEL[id]||id)+' · 상담 안내 '+n+'건</p>').join(''):'<p class="helper-small">상담 안내가 누적되면 증상별로 표시됩니다.</p>')+'<p>처리 대기 개선 제안: '+(ratingFailed?'조회 실패':suggestions.filter(x=>!['반영 완료','보류'].includes(x.status)).length+'건')+'</p><div class="helper-actions"><button data-notices>공지 관리</button><button data-suggestions>개선 제안 관리</button></div>';
    host.appendChild(section);host.querySelector('#helperPeriod').onchange=e=>renderStats(e.target.value);
    host.querySelector('[data-notices]').onclick=()=>{appState='announcements';render();};host.querySelector('[data-suggestions]').onclick=()=>{appState='suggestions';render();};
  };renderStats();
}
