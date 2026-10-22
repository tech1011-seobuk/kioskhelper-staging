import * as T from './three.module.js';
import {createSnapismModel} from './snapism-model.js';
import {GLTFLoader} from './GLTFLoader.js';
// Editable originals: camera-blender-build.py + camera-blender-base.py.
export function mountCamera(host,id){
 if(!['m50','850d','r10'].includes(id))return;
 return mountProduct(host,id,'camera');
}
export function mountPrinter(host,id){
 if(!['rx1','ask400'].includes(id))return;
 return mountProduct(host,id,'printer');
}
export function mountDevice(host,name,brand='photoism'){
 const ids={'카메라':['r10','camera'],'프린터':['rx1','printer'],'모니터':['monitor','device'],'리모컨':['remote','device'],'카드리더기':['card','device'],'지폐투입기':['banknote','device'],'에스라이트':['light','device'],'지속광':['led','device'],'PC':['pc','device'],'서비스코인':['service','device'],'서비스코인 / 설정':['service','device']};
 if(brand==='snapism')return mountProduct(host,name,'snap');
 const item=ids[name];if(!item)return null;
 return mountProduct(host,item[0],item[1],true);
}
function mountProduct(host,id,kind,detail=false){
 detail=detail||kind==='snap';
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=detail;renderer.shadowMap.type=T.VSMShadowMap;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='width:100%;height:100%;pointer-events:none;touch-action:pan-y';host.appendChild(canvas);
 const scene=new T.Scene(),root=new T.Group(),camera=new T.PerspectiveCamera(30,1,.1,1500);scene.add(root);camera.position.set(-48,26,260);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight(0xf5f6fa,0x343239,1.1));
 [[-90,140,140,0xfff5e8,2.6],[150,50,90,0xdce8ff,.85],[20,100,-120,0xffffff,3.2]].forEach(([x,y,z,c,i])=>{const l=new T.DirectionalLight(c,i);l.position.set(x,y,z);if(detail&&x===-90){l.castShadow=true;l.shadow.mapSize.set(1024,1024);Object.assign(l.shadow.camera,{left:-110,right:110,top:110,bottom:-110,near:1,far:500});l.shadow.bias=-.0003;l.shadow.normalBias=.12;l.shadow.radius=5;l.shadow.blurSamples=8;}scene.add(l);});
 const textures=[];
 function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 const studio=texture(1024,512,(c,W,H)=>{c.fillStyle='#191b20';c.fillRect(0,0,W,H);for(const [x,y,w,h] of [[170,70,100,280],[630,100,200,220],[870,150,35,240]]){const g=c.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,h*.65);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#b9bec6');g.addColorStop(1,'#191b20');c.fillStyle=g;c.fillRect(x-w/2,y-h/2,w*2,h*2);}});studio.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(studio);scene.environment=environment.texture;pmrem.dispose();
 const shadow=texture(256,128,(c,W,H)=>{const g=c.createRadialGradient(W/2,H/2,2,W/2,H/2,W/2);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);});
 const floor=new T.Mesh(new T.PlaneGeometry(170,100),new T.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-55;scene.add(floor);
 const contact=new T.Mesh(new T.PlaneGeometry(650,650),new T.ShadowMaterial({opacity:.3}));contact.rotation.x=-Math.PI/2;contact.receiveShadow=true;contact.visible=detail;scene.add(contact);
 // Reproducible microtexture; preserve printed labels and existing image maps.
 const grain=texture(128,128,(c,W,H)=>{const d=c.createImageData(W,H);let seed=41;for(let i=0;i<d.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=110+(seed>>>26);d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}c.putImageData(d,0,0);});grain.colorSpace=T.NoColorSpace;grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(28,28);
 function finishMaterial(m){
  if(!m.isMeshStandardMaterial)return;
  const name=m.name.toLowerCase();m.envMapIntensity=.85;
  if(/rubber|grip/.test(name)){m.roughness=.82;m.metalness=0;if(!m.normalMap&&!m.bumpMap){m.bumpMap=grain;m.bumpScale=.003;}}
  else if(/polycarbonate|enclosure|moulded|plastic|scrap box/.test(name)){m.roughness=/enclosure|moulded/.test(name)?.43:.49;m.metalness=0;if(!m.normalMap&&!m.bumpMap){m.bumpMap=grain;m.bumpScale=.001;}}
  else if(/aluminium|satin metal|anodised/.test(name)){m.roughness=.3;m.metalness=.8;}
  else if(/glass|optical/.test(name)){m.roughness=.12;m.envMapIntensity=1.2;}
  m.needsUpdate=true;
 }
 let disposed=false,failed=false,loaded=false,visible=true,hover=false,focused=false,frame=0,last=0,elapsed=0,lastRender=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
 const phase={m50:0,'850d':.08,r10:-.08,rx1:0,ask400:.08}[id]||0;
 const card=host.closest('.camera-card');
 function release(object){const gs=new Set(),ms=new Set(),ts=new Set();object.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);for(const value of Object.values(m))if(value?.isTexture)ts.add(value);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
 function draw(now){frame=0;if(disposed||failed)return;
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  const animate=loaded&&!reduced&&visible&&!document.hidden;
  if(animate&&!hover&&!focused)elapsed+=dt;
  root.rotation.y=reduced?0:detail?phase+Math.sin(elapsed/7)*.065:phase+elapsed*Math.PI*2/36;
  root.rotation.x=reduced||detail?0:Math.sin(elapsed*Math.PI/16)*.018;
  root.position.y=reduced||detail?0:Math.sin(elapsed*Math.PI/4)*1.8;
  if(!animate||now-lastRender>=1000/30){renderer.render(scene,camera);lastRender=now;}
  if(animate&&!hover&&!focused)frame=requestAnimationFrame(draw);
 }
 function request(){if(!disposed&&!failed&&!frame){last=0;frame=requestAnimationFrame(draw);}}
 function pause(){cancelAnimationFrame(frame);frame=0;last=0;}
 const visibility=()=>{if(document.hidden)pause();else if(visible)request();};document.addEventListener('visibilitychange',visibility);
 const motionChange=()=>{reduced=motion.matches;request();};motion.addEventListener('change',motionChange);
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else pause();});intersection.observe(host);
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();request();});resize.observe(host);
 const enter=e=>{if(e.pointerType==='mouse'){hover=true;request();}},leave=()=>{hover=false;request();},focus=()=>{focused=true;request();},blur=()=>{focused=false;request();};
 card?.addEventListener('pointerenter',enter);card?.addEventListener('pointerleave',leave);card?.addEventListener('focusin',focus);card?.addEventListener('focusout',blur);
 function fail(){if(disposed)return;failed=true;pause();host.classList.add('camera-render-failed');host.dataset.cameraSource='unavailable';host.dispatchEvent(new Event('modelerror'));canvas.style.display='none';}
 function accept(gltf){
  if(disposed){release(gltf.scene);return;}
  const model=gltf.scene,box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const scale=(detail?126:120)/Math.max(size.x,size.y,size.z);model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);root.add(model);floor.position.y=-size.y*scale/2-.4;contact.position.y=floor.position.y-.15;
  model.traverse(o=>{if(o.isMesh){o.castShadow=detail;o.receiveShadow=detail;}for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])finishMaterial(m);});loaded=true;host.dataset.cameraSource='blender';host.dispatchEvent(new Event('modelready'));request();
 }
 if(kind==='snap'){
  const source=createSnapismModel(),part=new T.Group();source.updateMatrixWorld(true);
  const prefixes={'모니터':['monitor_'],'카드리더기':['terminal_'],'PC':['PC','USB_'],'CX7600':['CX','purple_card'],'DS620':['DS620','DNP_'],'서비스코인':['coin_','setting_','button_','service_','breaker']};
  const wanted=prefixes[id]||[];
  source.traverse(o=>{if(o.isMesh&&wanted.some(n=>o.name.startsWith(n))){const copy=o.clone();copy.applyMatrix4(o.parent.matrixWorld);part.add(copy);}});
  if(part.children.length)accept({scene:part});else fail();
 }else new GLTFLoader().load(new URL('assets/'+kind+'-'+id+'.glb',document.baseURI).href,accept,undefined,fail);
 function dispose(){if(disposed)return;disposed=true;pause();resize.disconnect();intersection.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);card?.removeEventListener('pointerenter',enter);card?.removeEventListener('pointerleave',leave);card?.removeEventListener('focusin',focus);card?.removeEventListener('focusout',blur);release(scene);textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});canvas.addEventListener('webglcontextlost',fail);request();return {dispose};
}
