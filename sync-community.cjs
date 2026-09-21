const fs=require('node:fs');
const path=require('node:path');
const root=__dirname,file=path.join(root,'index.html');
let html=fs.readFileSync(file,'utf8');
const start='/* HELPER COMMUNITY START */',end='/* HELPER COMMUNITY END */';
const block=start+'\n'+fs.readFileSync(path.join(root,'community-ui.js'),'utf8')+'\n'+end;
if(html.includes(start))html=html.slice(0,html.indexOf(start))+block+html.slice(html.indexOf(end)+end.length);
else html=html.replace('/* ============================= FLOW LOGIC ============================= */',block+'\n\n/* ============================= FLOW LOGIC ============================= */');
fs.writeFileSync(file,html);
