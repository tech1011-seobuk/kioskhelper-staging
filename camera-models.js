import * as T from './three.module.js';
// Original lightweight visualization; Canon part-name drawings are reference only.
// Shapes are approximations for model selection, not CAD or a repair diagram.
export function mountCamera(host,id){
 const cfg={m50:{w:116,h:65,d:32,grip:26,mount:24,hump:15,label:'M50 II'},'850d':{w:131,h:78,d:48,grip:35,mount:29,hump:20,label:'850D'},r10:{w:122,h:70,d:36,grip:36,mount:29,hump:17,label:'R10'}}[id];
 if(!cfg)return;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='width:100%;height:100%;pointer-events:none;touch-action:pan-y';host.appendChild(canvas);
 const scene=new T.Scene(),root=new T.Group(),camera=new T.PerspectiveCamera(32,1,.1,1500);scene.add(root);camera.position.set(-100,70,270);camera.lookAt(0,7,0);
 scene.add(new T.HemisphereLight(0xf1f4ff,0x33363e,3));
 [[-100,150,180,0xffffff,4],[140,75,10,0xc6d9ee,3],[0,80,-100,0xffffff,4]].forEach(([x,y,z,c,i])=>{const l=new T.DirectionalLight(c,i);l.position.set(x,y,z);scene.add(l);});
 const textures=[];
 function tex(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 const grain=tex(128,128,(c,w,h)=>{let seed=73;for(let y=0;y<h;y++)for(let x=0;x<w;x++){seed=(seed*1664525+1013904223)>>>0;const a=90+(seed%80);c.fillStyle='rgb('+a+','+a+','+a+')';c.fillRect(x,y,1,1);}});grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(.16,.16);
 const mats={body:new T.MeshStandardMaterial({color:0x101114,roughness:.62,metalness:.15}),rubber:new T.MeshStandardMaterial({color:0x08090a,roughness:.92,bumpMap:grain,bumpScale:.22}),edge:new T.MeshStandardMaterial({color:0x252629,roughness:.4,metalness:.3}),silver:new T.MeshStandardMaterial({color:0xb5b8bd,metalness:.65,roughness:.26}),black:new T.MeshStandardMaterial({color:0x020305,roughness:.72}),gold:new T.MeshStandardMaterial({color:0xb49b55,metalness:.65,roughness:.3}),glass:new T.MeshPhysicalMaterial({color:0x24403e,metalness:.48,roughness:.14,clearcoat:1}),red:new T.MeshStandardMaterial({color:0xbc211a,roughness:.4}),white:new T.MeshStandardMaterial({color:0xe5e4df,roughness:.4})};
 function add(g,m,x,y,z){const o=new T.Mesh(g,typeof m==='string'?mats[m]:m);o.position.set(x,y,z);root.add(o);return o;}
 function rounded(w,h,d,x,y,z,r=3,m='body'){
  const s=new T.Shape(),a=-w/2+r,b=-h/2+r;s.moveTo(a,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,b);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,b);s.quadraticCurveTo(-w/2,-h/2,a,-h/2);
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(1,d-2),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:1,bevelThickness:1,curveSegments:10});g.translate(0,0,-d/2+1);return add(g,m,x,y,z);
 }
 function cyl(r,d,x,y,z,m='black',top=false){const o=add(new T.CylinderGeometry(r,r,d,64),m,x,y,z);if(!top)o.rotation.x=Math.PI/2;return o;}
 function ring(r,t,x,y,z,m='silver'){return add(new T.TorusGeometry(r,t,12,80),m,x,y,z);}
 function label(text,w,h,x,y,z,size=72){const map=tex(512,128,(c,W,H)=>{c.fillStyle='#eeeeec';c.font='bold '+size+'px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,490);});return add(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),x,y,z);}
 const {w,h,d,mount:r}=cfg,front=d/2+2;
 rounded(w-3,h,d,0,0,0,8);
 // Contoured shoulder shell, sloping up into the viewfinder / closed flash.
 const shape=new T.Shape();shape.moveTo(-w/2+5,h/2-4);shape.quadraticCurveTo(-w/2+4,h/2+4,-29,h/2+3);shape.lineTo(-17,h/2+cfg.hump);shape.quadraticCurveTo(0,h/2+cfg.hump+4,18,h/2+cfg.hump);shape.lineTo(29,h/2+2);shape.quadraticCurveTo(w/2,h/2+3,w/2-4,h/2-5);shape.lineTo(-w/2+5,h/2-4);
 const top=new T.ExtrudeGeometry(shape,{depth:d-8,bevelEnabled:true,bevelSegments:4,bevelSize:2,bevelThickness:2,curveSegments:16});top.translate(0,0,-d/2+3);add(top,'body',0,0,0);
 // Front grip protrusion is intentionally different for each model.
 rounded(cfg.grip,h-8,id==='m50'?29:43,-w/2+cfg.grip/2+2,-2,front-3,10,'rubber');
 rounded(17,h-15,4,w/2-11,-5,front,4,'rubber');
 rounded(w-5,5,d-2,0,-h/2+2,0,2,'edge');
 // Mount recess / mirror box or sensor, bayonet, contacts and screws.
 const mx=5,my=-4;
 cyl(r+3,5,mx,my,front+1,'edge');cyl(r-1,1,mx,my,front+4,'black');
 rounded(id==='850d'?32:24,id==='850d'?23:16,1,mx,my,front+5,1,'glass');
 if(id==='850d'){const mirror=rounded(31,20,1,mx,my,front+6,1,'silver');mirror.rotation.x=-.18;}
 add(new T.RingGeometry(r-3,r+1,96),'silver',mx,my,front+5.5);
 ring(r+1,.45,mx,my,front+5);ring(r-3,.55,mx,my,front+5.5,'edge');
 for(let i=0;i<7;i++)ring(r-2.8+i*.48,.045,mx,my,front+5.6,'edge');
 rounded(31,23,.5,mx,my,front+4.5,1,'black');
 if(id==='850d'){for(const yy of [-16,16])rounded(32,2,1,mx,my+yy,front+6,1,'edge');}
 for(let i=0;i<4;i++){const a=.45+i*Math.PI/2,x=mx+Math.cos(a)*r,y=my+Math.sin(a)*r;cyl(1.1,.6,x,y,front+6,'black');rounded(1.4,.25,.2,x,y,front+6.5,.05,'silver');}
 for(let i=0;i<(id==='r10'?12:9);i++){const a=4.25+i*.085; cyl(.8,.5,mx+Math.cos(a)*(r-4),my+Math.sin(a)*(r-4),front+6,'gold');}
 cyl(1.25,.5,mx,my+r+3,front+5,id==='m50'?'white':'red');
 cyl(3,2,mx+r+8,my+3,front+2,'edge');
 cyl(2,1,-w/2+25,h/2-12,front+4,'glass');
 if(id==='r10')rounded(9,5,2,-23,0,front+5,1,'edge');
 // Top controls: ribbed mode dial, shutter, record button, hot shoe.
 const dialX=-w/2+23,dialY=h/2+5;
 cyl(9,4,dialX,dialY,-4,'edge',true);cyl(8.5,.7,dialX,dialY+2.5,-4,'black',true);
 for(let i=0;i<32;i++){const a=i*Math.PI/16;const rib=rounded(.6,3,1,dialX+Math.cos(a)*8.9,dialY,-4+Math.sin(a)*8.9,.2,'silver');rib.rotation.y=-a;}
 const dt=tex(256,256,(c,W,H)=>{c.fillStyle='#101113';c.fillRect(0,0,W,H);c.fillStyle='#eee';c.font='24px Arial';c.textAlign='center';['M','Av','Tv','P','A+','SCN'].forEach((v,i)=>{const a=i*Math.PI/3;c.save();c.translate(128+Math.cos(a)*80,128+Math.sin(a)*80);c.rotate(a+Math.PI/2);c.fillText(v,0,8);c.restore();});});
 const dialFace=add(new T.CircleGeometry(8,48),new T.MeshBasicMaterial({map:dt}),dialX,dialY+3,-4);dialFace.rotation.x=-Math.PI/2;
 cyl(5,2,-w/2+17,h/2+2,front+6,'silver',true);cyl(4,1,-w/2+17,h/2+3.5,front+6,'black',true);
 cyl(2,1,-w/2+35,h/2+3,front-3,'black',true);cyl(.7,1,-w/2+35,h/2+4,front-3,'red',true);
 rounded(19,2,16,0,h/2+cfg.hump+3,-3,1,'black');rounded(2,2,16,-9,h/2+cfg.hump+4,-3,.4,'silver');rounded(2,2,16,9,h/2+cfg.hump+4,-3,.4,'silver');
 label('Canon',33,9,1,h/2+7,front+1,82);label('EOS',14,5,w/2-14,h/2-10,front+2,70);label(cfg.label,17,5,w/2-14,h/2-17,front+2,65);
 // Back LCD, eyecup and controls support the alternate rear view.
 rounded(73,47,4,-12,-3,-d/2-2,3,'edge');rounded(67,41,1,-12,-3,-d/2-4.5,2,'black');
 rounded(23,14,8,0,h/2+3,-d/2-2,3,'rubber');rounded(15,8,1,0,h/2+3,-d/2-7,1,'glass');
 for(let i=0;i<4;i++)cyl(2.4,2,w/2-13,h/2-9-i*8,-d/2-3,'edge');cyl(8,2,w/2-15,-16,-d/2-3,'edge');cyl(3.5,3,w/2-15,-16,-d/2-4,'black');
 for(const x of [-w/2,w/2]){const lug=ring(3,1,x,h/2-4,0);lug.rotation.y=Math.PI/2;}
 const shadow=tex(256,128,(c,W,H)=>{const g=c.createRadialGradient(W/2,H/2,2,W/2,H/2,W/2);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);});
 const floor=add(new T.PlaneGeometry(190,100),new T.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false}),0,-h/2-8,0);floor.rotation.x=-Math.PI/2;
 let frame=0,disposed=false,yaw=0,targetYaw=0,pitch=0,targetPitch=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function draw(){frame=0;if(disposed)return;yaw+=(targetYaw-yaw)*(reduced?1:.1);pitch+=(targetPitch-pitch)*(reduced?1:.1);root.rotation.y=yaw;root.rotation.x=pitch;renderer.render(scene,camera);if(Math.abs(targetYaw-yaw)+Math.abs(targetPitch-pitch)>.001)frame=requestAnimationFrame(draw);}
 function request(){if(!disposed&&!frame)frame=requestAnimationFrame(draw);}
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();request();});resize.observe(host);
 const card=host.closest('.camera-card');
 const move=e=>{if(e.pointerType!=='mouse'||reduced)return;const b=host.getBoundingClientRect();targetYaw=(e.clientX-b.left)/b.width*.28-.14;targetPitch=((e.clientY-b.top)/b.height-.5)*.1;request();};
 const leave=()=>{targetYaw=0;targetPitch=0;request();};card?.addEventListener('pointermove',move);card?.addEventListener('pointerleave',leave);
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();card?.removeEventListener('pointermove',move);card?.removeEventListener('pointerleave',leave);const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});
 canvas.addEventListener('webglcontextlost',()=>{if(!disposed){host.classList.add('camera-render-failed');canvas.style.display='none';}});
 request();return {dispose};
}
