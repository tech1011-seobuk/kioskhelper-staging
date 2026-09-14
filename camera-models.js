import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
// Editable originals: camera-blender-build.py + camera-blender-base.py.
export function mountCamera(host,id){
 if(!['m50','850d','r10'].includes(id))return;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='width:100%;height:100%;pointer-events:none;touch-action:pan-y';host.appendChild(canvas);
 const scene=new T.Scene(),root=new T.Group(),camera=new T.PerspectiveCamera(30,1,.1,1500);scene.add(root);camera.position.set(-55,32,260);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight(0xf1f4ff,0x33363e,2));
 [[-100,150,180,0xffffff,3],[140,75,10,0xc6d9ee,2],[0,80,-100,0xffffff,3]].forEach(([x,y,z,c,i])=>{const l=new T.DirectionalLight(c,i);l.position.set(x,y,z);scene.add(l);});
 const textures=[];
 function texture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 const studio=texture(1024,512,(c,W,H)=>{c.fillStyle='#191b20';c.fillRect(0,0,W,H);for(const [x,y,w,h] of [[170,70,100,280],[630,100,200,220],[870,150,35,240]]){const g=c.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,h*.65);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#b9bec6');g.addColorStop(1,'#191b20');c.fillStyle=g;c.fillRect(x-w/2,y-h/2,w*2,h*2);}});studio.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(studio);scene.environment=environment.texture;pmrem.dispose();
 const shadow=texture(256,128,(c,W,H)=>{const g=c.createRadialGradient(W/2,H/2,2,W/2,H/2,W/2);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);});
 const floor=new T.Mesh(new T.PlaneGeometry(170,100),new T.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-55;scene.add(floor);
 let disposed=false,failed=false,loaded=false,visible=true,hover=false,focused=false,frame=0,last=0,elapsed=0,lastRender=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
 const phase={m50:0,'850d':.08,r10:-.08}[id];
 const card=host.closest('.camera-card');
 function release(object){const gs=new Set(),ms=new Set(),ts=new Set();object.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);for(const value of Object.values(m))if(value?.isTexture)ts.add(value);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
 function draw(now){frame=0;if(disposed||failed)return;
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  const animate=loaded&&!reduced&&visible&&!document.hidden;
  if(animate&&!hover&&!focused)elapsed+=dt;
  root.rotation.y=reduced?0:phase+elapsed*Math.PI*2/48;
  root.rotation.x=reduced?0:Math.sin(elapsed*Math.PI/16)*.018;
  root.position.y=reduced?0:Math.sin(elapsed*Math.PI/4)*1.8;
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
 function fail(){if(disposed)return;failed=true;pause();host.classList.add('camera-render-failed');host.dataset.cameraSource='unavailable';canvas.style.display='none';}
 new GLTFLoader().load(new URL('assets/camera-'+id+'.glb',document.baseURI).href,gltf=>{
  if(disposed){release(gltf.scene);return;}
  const model=gltf.scene,box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const scale=120/Math.max(size.x,size.y);model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);root.add(model);floor.position.y=-size.y*scale/2-5;
  model.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])m.envMapIntensity=.65;});loaded=true;host.dataset.cameraSource='blender';request();
 },undefined,fail);
 function dispose(){if(disposed)return;disposed=true;pause();resize.disconnect();intersection.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);card?.removeEventListener('pointerenter',enter);card?.removeEventListener('pointerleave',leave);card?.removeEventListener('focusin',focus);card?.removeEventListener('focusout',blur);release(scene);textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});canvas.addEventListener('webglcontextlost',fail);request();return {dispose};
}
