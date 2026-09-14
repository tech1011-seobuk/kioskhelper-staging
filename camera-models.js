import * as T from './three.module.js';
import {buildCamera} from './camera-geometry.js';
// Original lightweight visualization; Canon part-name drawings are reference only.
// Shapes are approximations for model selection, not CAD or a repair diagram.
export function mountCamera(host,id){
 const cfg={m50:{w:116,h:65,d:32,grip:26,mount:24,hump:15,label:'M50 II'},'850d':{w:131,h:78,d:48,grip:35,mount:29,hump:20,label:'850D'},r10:{w:122,h:70,d:36,grip:36,mount:29,hump:17,label:'R10'}}[id];
 if(!cfg)return;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='width:100%;height:100%;pointer-events:none;touch-action:pan-y';host.appendChild(canvas);
 const scene=new T.Scene(),root=new T.Group(),camera=new T.PerspectiveCamera(30,1,.1,1500);scene.add(root);camera.position.set(-65,45,235);camera.lookAt(0,7,0);
 scene.add(new T.HemisphereLight(0xf1f4ff,0x33363e,3));
 [[-100,150,180,0xffffff,4],[140,75,10,0xc6d9ee,3],[0,80,-100,0xffffff,4]].forEach(([x,y,z,c,i])=>{const l=new T.DirectionalLight(c,i);l.position.set(x,y,z);scene.add(l);});
 const textures=[];
 function tex(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 const grain=tex(128,128,(c,w,h)=>{let seed=73;for(let y=0;y<h;y++)for(let x=0;x<w;x++){seed=(seed*1664525+1013904223)>>>0;const a=90+(seed%80);c.fillStyle='rgb('+a+','+a+','+a+')';c.fillRect(x,y,1,1);}});grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(.16,.16);
 const studioMap=tex(1024,512,(c,W,H)=>{c.fillStyle='#191b20';c.fillRect(0,0,W,H);for(const [x,y,w,h] of [[170,70,100,280],[630,100,200,220],[870,150,35,240]]){const g=c.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,h*.65);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#b9bec6');g.addColorStop(1,'#191b20');c.fillStyle=g;c.fillRect(x-w/2,y-h/2,w*2,h*2);}});studioMap.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromEquirectangular(studioMap);scene.environment=envTarget.texture;pmrem.dispose();
 const mats={body:new T.MeshStandardMaterial({color:0x101114,roughness:.64,metalness:.06,envMapIntensity:.3}),rubber:new T.MeshStandardMaterial({color:0x08090a,roughness:.92,bumpMap:grain,bumpScale:.22}),edge:new T.MeshStandardMaterial({color:0x252629,roughness:.4,metalness:.3}),silver:new T.MeshStandardMaterial({color:0xb5b8bd,metalness:.7,roughness:.4}),black:new T.MeshStandardMaterial({color:0x020305,roughness:.72}),gold:new T.MeshStandardMaterial({color:0xb49b55,metalness:.65,roughness:.3}),glass:new T.MeshPhysicalMaterial({color:0x24403e,metalness:.48,roughness:.14,clearcoat:1}),red:new T.MeshStandardMaterial({color:0xbc211a,roughness:.4}),white:new T.MeshStandardMaterial({color:0xe5e4df,roughness:.4})};
 function add(g,m,x,y,z){const o=new T.Mesh(g,typeof m==='string'?mats[m]:m);o.position.set(x,y,z);root.add(o);return o;}
 function rounded(w,h,d,x,y,z,r=3,m='body'){
  const s=new T.Shape(),a=-w/2+r,b=-h/2+r;s.moveTo(a,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,b);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,b);s.quadraticCurveTo(-w/2,-h/2,a,-h/2);
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(1,d-2),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:1,bevelThickness:1,curveSegments:10});g.translate(0,0,-d/2+1);return add(g,m,x,y,z);
 }
 function cyl(r,d,x,y,z,m='black',top=false){const o=add(new T.CylinderGeometry(r,r,d,64),m,x,y,z);if(!top)o.rotation.x=Math.PI/2;return o;}
 function ring(r,t,x,y,z,m='silver'){return add(new T.TorusGeometry(r,t,12,80),m,x,y,z);}
 function label(text,w,h,x,y,z,size=72,font='Arial'){const map=tex(512,128,(c,W,H)=>{c.fillStyle='#eeeeec';c.font='bold '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.translate(W/2,H/2);c.scale(460/Math.max(c.measureText(text).width,1),1);c.fillText(text,0,0);});return add(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),x,y,z);}
 const model=buildCamera(root,id,{add,rounded,cyl,ring,label,tex,mats});const h=-model.bottom*2;
 const shadow=tex(256,128,(c,W,H)=>{const g=c.createRadialGradient(W/2,H/2,2,W/2,H/2,W/2);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);});
 const floor=add(new T.PlaneGeometry(190,100),new T.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false}),0,-h/2-8,0);floor.rotation.x=-Math.PI/2;
 // The shadow stays grounded while the body gently floats.
 root.remove(floor);scene.add(floor);
 let frame=0,disposed=false,yaw=0,targetYaw=0,pitch=0,targetPitch=0,visible=true,lastTime=0,elapsed=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motion.matches;
 const phase={m50:0,'850d':.65,r10:1.3}[id];
 function draw(now){frame=0;if(disposed)return;
  const dt=lastTime?Math.min((now-lastTime)/1000,.05):0;lastTime=now;
  const animate=!reduced&&visible&&!document.hidden;if(animate)elapsed+=dt;
  const ease=reduced?1:1-Math.exp(-dt*7);yaw+=(targetYaw-yaw)*ease;pitch+=(targetPitch-pitch)*ease;
  root.rotation.y=reduced?0:yaw+Math.sin(elapsed*Math.PI/12+phase)*.23;
  root.rotation.x=reduced?0:pitch+Math.sin(elapsed*Math.PI/16+phase)*.025;
  root.position.y=reduced?0:Math.sin(elapsed*Math.PI/4+phase)*2;
  renderer.render(scene,camera);if(animate)frame=requestAnimationFrame(draw);
 }
 function request(){if(!disposed&&!frame){lastTime=0;frame=requestAnimationFrame(draw);}}
 function pause(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
 const visibility=()=>{if(document.hidden)pause();else if(visible)request();};document.addEventListener('visibilitychange',visibility);
 const motionChange=()=>{reduced=motion.matches;request();};motion.addEventListener('change',motionChange);
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else pause();});intersection.observe(host);
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();request();});resize.observe(host);
 const card=host.closest('.camera-card');
 const move=e=>{if(e.pointerType!=='mouse'||reduced)return;const b=host.getBoundingClientRect();targetYaw=(e.clientX-b.left)/b.width*.28-.14;targetPitch=((e.clientY-b.top)/b.height-.5)*.1;request();};
 const leave=()=>{targetYaw=0;targetPitch=0;request();};card?.addEventListener('pointermove',move);card?.addEventListener('pointerleave',leave);
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);card?.removeEventListener('pointermove',move);card?.removeEventListener('pointerleave',leave);const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());envTarget.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});
 canvas.addEventListener('webglcontextlost',()=>{if(!disposed){host.classList.add('camera-render-failed');canvas.style.display='none';}});
 request();return {dispose};
}
