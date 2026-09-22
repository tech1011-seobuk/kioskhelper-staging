const fs=require('node:fs');
const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const manuals=source.map(d=>{
 const id=d.url.match(/articles\/(\d+)/)[1],sections=[];
 let section={title:d.title,cards:[]},pending=[],consumed=new Set();
 const flush=()=>{if(pending.length){section.cards.push({text:'참고 사진',images:pending,videos:[]});pending=[];}};
 const finish=()=>{flush();if(section.cards.length||section.held)sections.push(section);};
 d.blocks.forEach((b,i)=>{
  if(consumed.has(i))return;
  if(id==='144600'&&(i===15||i===16))return;
  if(b.heading){finish();section={title:b.text,cards:[]};
   if((id==='194833'&&i===16)||(id==='287949'&&i===10))section.held='칼라리본 교체 3단계의 부품명이 원문에서 일치하지 않아 확인 중이에요. 해당 교체 절차는 확인 후 제공할게요.';
   return;
  }
  if(section.held)return;
  if(id==='144600'&&b.text&&!b.images.length&&d.blocks[i+1]?.images.length){
   section.cards.push({text:b.text,images:d.blocks[i+1].images.filter(u=>u.startsWith('https://cf.channel.io/')),videos:[]});consumed.add(i+1);return;
  }
  const images=[...new Set([...pending,...b.images].filter(u=>u.startsWith('https://cf.channel.io/')))];
  if(!b.text&&!b.videos.length){pending=images;return;}
  pending=[];
  const parts=b.text.split(/(?=\b(?:STEP|STPE)\s+\d+)/).map(x=>x.trim()).filter(Boolean);
  if(!parts.length)parts.push('영상 매뉴얼');
  parts.forEach(text=>section.cards.push({text,images,videos:b.videos.map(u=>{const m=u.match(/embed\/([\w-]+)/);return m?'https://www.youtube.com/watch?v='+m[1]:u;})}));
 });finish();
 const device=/CX7600|포토카드/.test(d.title)?'CX7600':/DS620|인화지/.test(d.title)?'DS620':/프린터 교체/.test(d.title)?'프린터':/모니터/.test(d.title)?'모니터':/카드.?단말기/.test(d.title)?'카드리더기':/PC/.test(d.title)?'PC':/Coin/.test(d.title)?'서비스코인':'키오스크';
 return {id,title:d.title,device,source:d.url,sections,notice:id==='144600'?'DS620 설명에 들어간 DS-RX1 내부 사진은 원문 확인 중으로 제외했어요.':''};
});
fs.writeFileSync(__dirname+'/snapism-manuals.json',JSON.stringify(manuals,null,2)+'\n');
console.log(manuals.length+' manuals; '+new Set(manuals.flatMap(m=>m.sections.flatMap(s=>s.cards.flatMap(c=>c.images)))).size+' unique photos');
