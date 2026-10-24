(function(root){

 const text=v=>String(v??'').normalize('NFC').trim();

 const header=v=>text(v).replace(/\s/g,'').toLowerCase();

 const names={store:['매장명','매장','지점명','지점'],booth:['부스번호','키오스크id','부스','키오스크번호'],pay:['결제수단']};

 function detect(rows,type){for(let i=0;i<Math.min(rows.length,40);i++){const h=rows[i].map(header), map={};for(const [k,list] of Object.entries(names))map[k]=h.findIndex(x=>list.includes(x));if(map.store>=0&&map.booth>=0&&(type==='master'||map.pay>=0))return {row:i,...map};}return null;}

 function booth(v,unify){const s=text(v);const m=s.match(/^(\d+)(?:\.0+)?\s*(?:번|호)?$/);return unify&&m?m[1].replace(/^0+(?=\d)/,''):s;}

 const aliases={'서울 코엑스점 컬러드':'서울 코엑스 컬러드','코엑스 2호점':'서울 코엑스 2호점'}; const storeName=v=>{const n=text(v).replace(/^(직영|가맹|렌탈)\s+/, '').replace(/\s+/g,' ').trim();return aliases[n]||n;};

 const key=(s,b,u)=>JSON.stringify([storeName(s),booth(b,u)]);

 const sort=(a,b)=>a.store.localeCompare(b.store,'ko')||a.booth.localeCompare(b.booth,'ko',{numeric:true});

 function extract(rows,map,type){const pairs=[],invalid=[];let cardRows=0,dataRows=0;const methods=new Set();for(let i=map.row+1;i<rows.length;i++){const r=rows[i];if(!r.some(x=>text(x)))continue;dataRows++;if(type==='sales'){const p=text(r[map.pay]).toLowerCase();methods.add(p||'(빈 값)');if(p!=='card')continue;cardRows++;}const store=text(r[map.store]),b=text(r[map.booth]);if(!store||!b){invalid.push(i+1);continue;}pairs.push({store,booth:b});}return {pairs,invalid,cardRows,dataRows,methods:[...methods]};}

 function compare(master,sales,unify=false){const m=new Map(master.map(x=>[key(x.store,x.booth,unify),x])),s=new Map(sales.map(x=>[key(x.store,x.booth,unify),x]));const all=[...m].map(([k,x])=>({...x,present:s.has(k)})).sort(sort);return {all,missing:all.filter(x=>!x.present),present:all.filter(x=>x.present),extra:[...s].filter(([k])=>!m.has(k)).map(([,x])=>x).sort(sort),total:m.size,uniqueSales:s.size,duplicates:master.length-m.size};}

 const api={text,storeName,detect,extract,compare,key};root.CardCheck=api;if(typeof module!=='undefined')module.exports=api;

})(typeof globalThis!=='undefined'?globalThis:this);

