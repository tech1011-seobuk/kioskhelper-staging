let manualReviewRows={},manualReviewOwner='',manualReviewReady=false;
function legacyManualReview(sid){try{return JSON.parse(localStorage.getItem(diagramDraftKey()+':review:'+sid))||{};}catch{return {};}}
function reviewRecord(row){return {...row,content:typeof row.content==='string'?row.content:JSON.stringify(row.content)};}
async function loadManualReviews(){
 const owner=currentUser?.id;if(!sb||!owner||currentUser.role!=='admin')return false;
 manualReviewReady=false;manualReviewRows={};manualReviewOwner=owner;
 try{
  const rows={};let offset=0;
  while(true){const {data,error}=await sb.from('helper_manual_reviews').select('symptom_id,status,note,content,revision,updated_at').range(offset,offset+499);if(error)throw error;for(const r of data||[])rows[r.symptom_id]=reviewRecord(r);if((data||[]).length<500)break;offset+=500;}
  const prefix=diagramDraftKey()+':review:',keys=[];
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(prefix))keys.push(key);}}catch{/* Server storage remains usable if browser storage is unavailable. */}
  for(const key of keys){
   if(currentUser?.id!==owner)return false;
   const sid=key.slice(prefix.length),old=legacyManualReview(sid);
   if(rows[sid]||!['검토 전','업데이트 중','픽스'].includes(old.status))continue;
   let content;try{content=JSON.parse(old.content);}catch{continue;}if(!content||Array.isArray(content)||typeof content!=='object')continue;
   const {data,error}=await sb.rpc('save_manual_review',{p_sid:sid,p_status:old.status,p_note:old.note||'',p_content:content,p_revision:0,p_import:true});if(error)throw error;rows[sid]=reviewRecord(data);
  }
  if(currentUser?.id!==owner)return false;
  manualReviewRows=rows;manualReviewReady=true;return true;
 }catch{return false;}
}
async function saveManualReview(sid,status,note,source){
 const owner=currentUser?.id;
 if(!manualReviewReady||manualReviewOwner!==owner||currentUser?.role!=='admin')throw Error('검수 기록을 먼저 불러와주세요.');
 const revision=manualReviewRows[sid]?.revision||0;
 const {data,error}=await sb.rpc('save_manual_review',{p_sid:sid,p_status:status,p_note:note,p_content:source,p_revision:revision,p_import:false});if(error)throw error;
 if(currentUser?.id!==owner)throw Error('계정이 변경되었습니다.');
 manualReviewRows[sid]=reviewRecord(data);
 // Keep the original browser record intact as a recovery backup.
 return manualReviewRows[sid];
}
