import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
export {mountCamera,mountPrinter} from './camera-models.js';

// Original Blender model in metres, with an independently hinged front service door.
export function mount(host){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.01,30);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.style.pointerEvents='none';canvas.style.touchAction='auto';host.appendChild(canvas);
 const loading=document.createElement('div');loading.className='model-unavailable';loading.textContent='키오스크를 불러오는 중…';loading.setAttribute('role','status');loading.style.cssText='position:absolute;inset:40% 0 auto;text-align:center;pointer-events:none';host.appendChild(loading);host.dataset.modelState='loading';
 const studioCanvas=document.createElement('canvas');studioCanvas.width=512;studioCanvas.height=256;const sc=studioCanvas.getContext('2d');sc.fillStyle='#454951';sc.fillRect(0,0,512,256);for(const [x,y,w,h] of [[90,95,110,150],[330,100,140,150]]){const grad=sc.createRadialGradient(x,y,0,x,y,120);grad.addColorStop(0,'#ffffff');grad.addColorStop(.5,'#bbc4d0');grad.addColorStop(1,'#454951');sc.fillStyle=grad;sc.fillRect(x-w/2,y-h/2,w,h);}const studio=new T.CanvasTexture(studioCanvas);studio.colorSpace=T.SRGBColorSpace;studio.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(studio);scene.environment=environment.texture;scene.environmentIntensity=1.3;pmrem.dispose();studio.dispose();
 scene.add(new T.HemisphereLight(0xdde8ff,0x29282a,1.6));
 for(const [color,power,p] of [[0xffffff,2.7,[-2,3,4]],[0xc9dbff,2,[3,2,-3]],[0xffffff,1.6,[-2,1,-4]]]){const l=new T.DirectionalLight(color,power);l.position.set(...p);scene.add(l);}
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const c=shadowCanvas.getContext('2d'),g=c.createRadialGradient(64,64,4,64,64,60);g.addColorStop(0,'rgba(0,0,0,.48)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
 const shadow=new T.Mesh(new T.PlaneGeometry(1.5,1.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;scene.add(shadow);
 // Soft light halos supplement the GLB emission without a full-screen bloom pass.
 const lightHalos=new T.Group();scene.add(lightHalos);
 function lightHalo(x,y,z,w,h,tilt=0){
  const surface=document.createElement('canvas');surface.width=surface.height=256;const ctx=surface.getContext('2d');
  ctx.shadowColor='rgba(238,245,255,.55)';ctx.shadowBlur=23;ctx.fillStyle='rgba(245,249,255,.10)';ctx.beginPath();ctx.roundRect(48,48,160,160,24);ctx.fill();
  const texture=new T.CanvasTexture(surface);texture.colorSpace=T.SRGBColorSpace;
  const glow=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,opacity:.6}));
  glow.position.set(x,y,z);glow.rotation.x=tilt;lightHalos.add(glow);
 }
 lightHalo(0,1.872,.115,.66,.15,Math.atan2(.085,.210));
 for(const x of [-.315,.315])lightHalo(x,1.558,.064,.072,.36);
 let openness=0,frame=0,disposed=false,tween=null,model=null,door=null,pending=null,framingPoints=[],framingDistance=3.65;
 const target=new T.Vector3(0,1,0),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Fit the entire door sweep once, so opening never moves the camera or clips the door.
 function fitFrame(){
  let distance=Math.max(3.65,host.clientHeight/Math.max(host.clientWidth,1)*3.12);
  for(let i=0;i<100;i++){
   camera.position.set(0,1.16,distance);camera.lookAt(target);camera.updateMatrixWorld();
   if(framingPoints.every(p=>{const v=p.clone().project(camera);return Math.abs(v.x)<=.92&&Math.abs(v.y)<=.92&&v.z<1;}))break;
   distance*=1.025;
  }
  framingDistance=distance;
 }
 function measureDoorSweep(){
  framingPoints=[];
  for(let degrees=0;degrees<=110;degrees+=5){
   door.rotation.y=degrees*Math.PI/180;model.updateMatrixWorld(true);
   model.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])framingPoints.push(new T.Vector3(x,y,z).applyMatrix4(o.matrixWorld));
   });
  }
  door.rotation.y=openness*Math.PI*110/180;model.updateMatrixWorld(true);fitFrame();
 }
 function release(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});}
 function draw(now=performance.now()){frame=0;if(disposed)return;let done=null;if(tween){const t=reduced?1:Math.min(1,(now-tween.start)/1050),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;openness=tween.from+(tween.to-tween.from)*ease;if(t===1){done=tween.done;tween=null;}}
  if(door)door.rotation.y=openness*Math.PI*110/180;camera.position.set(0,1.16,framingDistance);camera.lookAt(target);host.dataset.doorState=tween?'moving':openness>.99?'open':'closed';renderer.render(scene,camera);host.dispatchEvent(new Event('modelrender'));if(tween)frame=requestAnimationFrame(draw);if(done)done();
 }
 function request(){if(!frame&&!disposed)frame=requestAnimationFrame(draw);}
 function view(mode,done){if(disposed)return;if(!model){pending={mode,done};return;}tween={from:openness,to:mode==='inside'?1:0,start:performance.now(),done};request();}
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fitFrame();request();});resize.observe(host);
 canvas.addEventListener('webglcontextlost',e=>{if(disposed)return;e.preventDefault();host.dispatchEvent(new CustomEvent('modelerror'));});
 const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{subtree:true,childList:true});
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();release(scene);environment.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();loading.remove();pending=null;}
 new GLTFLoader().load(new URL('./assets/photoism-kiosk-pointing.glb',document.baseURI).href,gltf=>{if(disposed){release(gltf.scene);return;}model=gltf.scene;door=model.getObjectByName('kiosk_front_door');if(!door){release(model);model=null;host.dispatchEvent(new CustomEvent('modelerror'));return;}scene.add(model);measureDoorSweep();loading.remove();host.dataset.modelSource='blender';host.dataset.modelState='ready';if(pending){const next=pending;pending=null;view(next.mode,next.done);}else request();},undefined,()=>{if(!disposed){host.dataset.modelState='error';host.dispatchEvent(new CustomEvent('modelerror'));}});
 const anchors={'에스라이트':[0,1.872,.103],'카메라':[0,1.548,.1],'지속광':[.315,1.558,.066],'모니터':[0,1.226,.160],'리모컨':[.337,1.238,.192],'지폐투입기':[-.25,.86,.286],'카드리더기':[-.065,.848,.3],'프린터':[.119,.575,.18],'PC':[-.099,1.0,.125],'서비스코인 / 설정':[.016,.329,.18]};
 request();return {project(name){const v=new T.Vector3(...anchors[name]).project(camera);return {x:(v.x+1)*host.clientWidth/2,y:(1-v.y)*host.clientHeight/2};},view,dispose};
}
