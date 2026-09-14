import * as T from './three.module.js';
// Dimensions in metres. Shell follows the supplied 850 x 500 x 1982 drawing.
// Internal equipment and unlabelled details are simplified from reference photos.
export function mount(host,onSelect){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.01,30);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 host.appendChild(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','포토이즘 3D 모델. 방향키로 회전, 더하기와 빼기로 확대 축소. 부품은 아래 버튼으로도 선택할 수 있습니다.');
 const root=new T.Group();scene.add(root);const shell=new T.Group(),inside=new T.Group(),back=new T.Group();root.add(shell,inside,back);
 scene.add(new T.HemisphereLight(0xdcefff,0x66616d,3));for(const [x,y,z,color,intensity] of [[3,4,4,0xffffff,4],[-3,2,-2,0x93c8ff,3],[1,1,-4,0xffffff,2]]){const light=new T.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);}
 const mats={body:new T.MeshStandardMaterial({color:0x08090b,roughness:.78,metalness:.12}),edge:new T.MeshStandardMaterial({color:0x151619,roughness:.62,metalness:.25}),black:new T.MeshStandardMaterial({color:0x101115,roughness:.55}),silver:new T.MeshStandardMaterial({color:0xa5a7ad,metalness:.7,roughness:.35}),white:new T.MeshStandardMaterial({color:0xe9e8e3,roughness:.6}),glass:new T.MeshStandardMaterial({color:0x082334,metalness:.7,roughness:.15}),light:new T.MeshStandardMaterial({color:0xf8f5ff,emissive:0xcad9ff,emissiveIntensity:2})};
 function mesh(geometry,material,x,y,z,part,parent=shell){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);if(part)m.userData.part=part;parent.add(m);return m;}
 function box(w,h,d,x,y,z,mat='body',part,parent=shell){return mesh(new T.BoxGeometry(w,h,d),mats[mat],x,y,z,part,parent);}
 function cylinder(r,h,x,y,z,mat='black',part,parent=shell){const m=mesh(new T.CylinderGeometry(r,r,h,32),mats[mat],x,y,z,part,parent);m.rotation.x=Math.PI/2;return m;}
 function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
 function plaque(text,w,h,x,y,z,rotation=0,parent=shell,bg='#15161a',fg='#fff',part){const map=texture(1024,256,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;c.font='bold 100px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,950);});const m=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,side:T.DoubleSide}),x,y,z,part,parent);m.rotation.x=rotation;return m;}
 const profile=[[.25,.082],[.25,1.082],[.05,1.362],[.05,1.772],[.135,1.982],[-.25,1.982],[-.25,.082]];
 const shape=new T.Shape();profile.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();const sideGeometry=new T.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:false});for(const x of [-.425,.401]){const m=mesh(sideGeometry,mats.body,x,0,0);m.rotation.y=Math.PI/2;}
 box(.85,.025,.385,0,1.9695,-.0575);box(.85,.035,.5,0,.0995,0);box(.802,.95,.018,0,.602,.25);
 function frontPanel(y1,z1,y2,z2,part){const length=Math.hypot(y2-y1,z2-z1),angle=Math.atan2(z2-z1,y2-y1);const m=box(.802,length,.018,0,(y1+y2)/2,(z1+z2)/2,'body',part);m.rotation.x=angle;return angle;}
 const angle=frontPanel(1.082,.25,1.362,.05,'모니터');frontPanel(1.362,.05,1.772,.05);const upperAngle=frontPanel(1.772,.05,1.982,.135,'에스라이트');
 plaque('PHOTOISM',.57,.105,0,1.872,.103,upperAngle,shell,'#e9ebed','#303238','에스라이트');
 for(const x of [-.315,.315]){const light=mesh(new T.CapsuleGeometry(.025,.29,6,14),mats.light,x,1.558,.066,'지속광');light.scale.z=.32;box(.062,.365,.015,x,1.558,.055,'silver','지속광');}
 cylinder(.038,.018,0,1.548,.072,'silver','카메라');cylinder(.031,.027,0,1.548,.085,'black','카메라');cylinder(.023,.002,0,1.548,.100,'glass','카메라');plaque('LOOK HERE!',.22,.045,0,1.64,.063,0,shell,'#24252a','#ffffff','카메라');
 const screen=mesh(new T.BoxGeometry(.52,.247,.019),new T.MeshStandardMaterial({color:0x17191d}),0,1.226,.163,'모니터');screen.rotation.x=angle;
 const display=mesh(new T.PlaneGeometry(.48,.212),new T.MeshBasicMaterial({color:0x030304}),0,1.232,.176,'모니터');display.rotation.x=angle;
 const remote=box(.044,.1,.017,.337,1.238,.17,'black','리모컨');remote.rotation.x=angle;for(let i=0;i<3;i++)cylinder(.005,.01,.337,1.21+i*.019,.192,'silver','리모컨');
 plaque('HOW TO USE   1  >  2  >  3  >  4  >  5',.72,.072,0,1.004,.261);
 box(.09,.032,.024,-.25,.859,.269,'silver','지폐투입기');box(.073,.009,.027,-.25,.86,.284,'black','지폐투입기');
 box(.042,.095,.04,-.065,.834,.278,'black','카드리더기');plaque('CARD',.034,.027,-.065,.848,.3,0,shell,'#24262b','#fff','카드리더기');
 box(.048,.065,.014,-.277,.612,.264,'silver','서비스코인');cylinder(.012,.023,-.277,.626,.28,'black','서비스코인');
 box(.225,.07,.013,.175,.615,.264,'black','프린터');box(.2,.006,.015,.175,.635,.274,'silver','프린터');
 for(const x of [-.348,.348])for(const z of [-.17,.17]){const m=cylinder(.041,.032,x,.041,z,'black');m.rotation.set(0,0,Math.PI/2);box(.045,.04,.065,x,.073,z,'silver');}
 // Rear doors and framing. Internal mode removes only the doors.
 for(const [y,h] of [[1.475,.965],[.572,.797]]){box(.8,h,.019,0,y,-.244,'body',undefined,back);for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(.083,.007,.004,-.235+col*.235,y-h*.3+row*.023,-.257,'black',undefined,back);cylinder(.011,.025,0,y+h*.38,-.26,'silver',undefined,back);}
 for(const x of [-.4,.4])box(.028,1.865,.035,x,1.015,-.229,'edge',undefined,inside);
 // Upper supports stop behind the sloped front skin; no exterior ledges.
 for(const y of [.12,.48,.96])box(.79,.025,.43,0,y,-.015,'edge',undefined,inside);
 box(.79,.025,.26,0,1.32,-.095,'edge',undefined,inside);
 box(.79,.025,.32,0,1.93,-.07,'edge',undefined,inside);
 box(.16,.11,.10,0,1.55,-.014,'black','카메라',inside);plaque('CAMERA',.12,.035,0,1.55,-.069,0,inside).rotation.y=Math.PI;
 for(const x of [-.315,.315])box(.058,.35,.055,x,1.55,-.002,'silver','지속광',inside);
 box(.59,.12,.09,0,1.87,-.01,'silver','에스라이트',inside);
 const mon=box(.53,.25,.055,0,1.224,.088,'silver','모니터',inside);mon.rotation.x=angle;
 box(.115,.35,.2,-.21,1.10,-.08,'black','PC',inside);plaque('PC',.065,.035,-.21,1.1,-.183,0,inside,'#17191b','#fff','PC').rotation.y=Math.PI;
 box(.34,.31,.31,.10,.66,-.065,'white','프린터',inside);plaque('HiTi',.17,.045,.10,.74,-.224,0,inside,'#deded9','#414141','프린터').rotation.y=Math.PI;
 for(let i=0;i<12;i++)box(.003,.12,.002,-.045+i*.024,.64,-.222,'black','프린터',inside);
 box(.115,.21,.06,-.31,.73,-.20,'black','지폐투입기',inside);box(.052,.11,.055,-.08,.834,.197,'black','카드리더기',inside);
 for(let i=0;i<4;i++){const points=[new T.Vector3(-.21+i*.026,1.24,-.19),new T.Vector3(-.31+i*.018,1.30,-.18),new T.Vector3(-.35+i*.016,1.6,-.13),new T.Vector3(-.2+i*.12,1.7,-.08)];mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.003,5,false),mats.black,0,0,0,undefined,inside);}
 // Subtle local shadow, with the existing page background visible around the model.
 const shadowMap=texture(128,128,(c,W,H)=>{const g=c.createRadialGradient(W/2,H/2,4,W/2,H/2,60);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);});const shadow=mesh(new T.PlaneGeometry(1.6,1.2),new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}),0,.002,0,undefined,root);shadow.rotation.x=-Math.PI/2;
 let yaw=0,frame=0,disposed=false,tween=null;
 const target=new T.Vector3(0,1.0,0),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 canvas.removeAttribute('tabindex');canvas.setAttribute('aria-hidden','true');canvas.removeAttribute('aria-label');canvas.style.pointerEvents='none';canvas.style.touchAction='auto';
 function draw(now=performance.now()){frame=0;if(disposed)return;let done=null;if(tween){const t=reduced?1:Math.min(1,(now-tween.start)/800),ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;yaw=tween.from+(tween.to-tween.from)*ease;if(t===1){done=tween.done;tween=null;}}
 const distance=Math.max(3.65,host.clientHeight/Math.max(host.clientWidth,1)*3.12);camera.position.set(Math.sin(yaw)*distance,1.16,Math.cos(yaw)*distance);camera.lookAt(target);renderer.render(scene,camera);host.dispatchEvent(new Event('modelrender'));if(tween)frame=requestAnimationFrame(draw);if(done)done();}
 function request(){if(!frame&&!disposed)frame=requestAnimationFrame(draw);}
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();request();});resize.observe(host);
 canvas.addEventListener('webglcontextlost',e=>{if(disposed)return;e.preventDefault();host.dispatchEvent(new CustomEvent('modelerror'));});
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 const observer=new MutationObserver(()=>{if(!host.isConnected)dispose();});observer.observe(document.body,{subtree:true,childList:true});
 const anchors={'에스라이트':[0,1.872,.103],'카메라':[0,1.548,.1],'지속광':[.315,1.558,.066],'모니터':[0,1.232,.176],'리모컨':[.337,1.238,.192],'지폐투입기':[-.25,.86,.284],'카드리더기':[-.065,.848,.3],'서비스코인':[-.277,.626,.28],'프린터':[.10,.74,-.224],'PC':[-.21,1.1,-.183]};
 request();return {project(name){const v=new T.Vector3(...anchors[name]).project(camera);return {x:(v.x+1)*host.clientWidth/2,y:(1-v.y)*host.clientHeight/2};},view(mode,done){if(disposed)return;back.visible=mode!=='inside';tween={from:yaw,to:mode==='inside'?Math.PI:0,start:performance.now(),done};request();},dispose};
}
