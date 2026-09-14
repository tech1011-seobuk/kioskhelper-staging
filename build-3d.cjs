// Run from any directory: node /path/to/build-3d.cjs
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=__dirname,read=n=>fs.readFileSync(path.join(root,n),'utf8');
(async()=>{
 const result=await esbuild.build({absWorkingDir:root,stdin:{contents:read('photoism-model.js'),loader:'js'},tsconfigRaw:{},plugins:[{name:'vendored-three',setup(b){b.onResolve({filter:/.*/},a=>({path:a.path,namespace:'local'}));b.onLoad({filter:/.*/,namespace:'local'},a=>({contents:read(path.basename(a.path)),loader:'js'}));}}],bundle:true,format:'iife',globalName:'PhotoismModel',minify:true,legalComments:'inline',write:false});
 let html=read('index.html');const original=html;
 function replaceSection(start,end,value){const a=html.indexOf(start),b=html.indexOf(end,a);if(a<0||b<0)throw Error('Missing integration marker: '+start);html=html.slice(0,a)+value+html.slice(b);}
 replaceSection('var PhotoismModel=','</script>',result.outputFiles[0].text.replaceAll('</script','<\\/script')+'\n');
 replaceSection("let photoismViewMode='3d';",'function renderPickerScreen()',read('photoism-picker.js').replace(/^\uFEFF/,'').trim()+'\n');
 replaceSection('/* PHOTOISM_CALLOUTS_START */','/* PHOTOISM_CALLOUTS_END */','/* PHOTOISM_CALLOUTS_START */\n'+read('photoism-callouts.css').replace(/^\uFEFF/,'').trim()+'\n');
 if(html===original){console.log('3D build is current; no files changed.');return;}
 const sw=read('sw.js');if(!/staging-v\d+/.test(sw))throw Error('Staging cache marker missing');
 fs.writeFileSync(path.join(root,'index.html'),html);fs.writeFileSync(path.join(root,'sw.js'),sw.replace(/staging-v(\d+)/,(_,n)=>'staging-v'+(+n+1)));console.log('Updated index.html and staging cache version. Commit both with the source changes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
