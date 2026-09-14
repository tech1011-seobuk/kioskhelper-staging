import * as T from './three.module.js';

// Separate front outlines and grip sections traced proportionally from each
// model's Canon front/top/side photos. Dimensions remain visual approximations.
export function buildCamera(root,id,H){
 const {add,rounded,cyl,ring,label,tex,mats}=H;
 const spec=id==='m50'?{w:116,bottom:-40,front:15,mx:10,my:-8,r:29.5,top:43,depth:32}:id==='850d'?{w:131,bottom:-49,front:26,mx:12,my:-14,r:33,top:49,depth:53}:{w:122.5,bottom:-43,front:18,mx:16,my:-7,r:33.5,top:43,depth:37};
 const {w,bottom,front:f,mx,my,r,top,depth}=spec;
 function extrude(shape,depth,z,mat='body',bevel=1){const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:5,curveSegments:24,steps:1});return add(g,mat,0,0,z);}
 function outline(){const s=new T.Shape();
  if(id==='m50'){
   s.moveTo(-55,-40);s.lineTo(55,-40);s.quadraticCurveTo(58,-40,58,-35);s.lineTo(58,20);s.quadraticCurveTo(58,24,53,24);s.lineTo(29,25);s.bezierCurveTo(24,25,24,42,19,43);s.lineTo(-10,43);s.bezierCurveTo(-16,42,-15,25,-22,25);s.lineTo(-49,25);s.quadraticCurveTo(-58,23,-58,18);s.lineTo(-58,-35);s.quadraticCurveTo(-58,-40,-55,-40);
  }else if(id==='850d'){
   s.moveTo(-58,-49);s.lineTo(59,-49);s.quadraticCurveTo(65,-47,65,-39);s.lineTo(64,12);s.bezierCurveTo(63,25,52,26,35,31);s.bezierCurveTo(29,34,28,45,20,48);s.quadraticCurveTo(3,51,-9,48);s.bezierCurveTo(-18,46,-21,31,-27,29);s.bezierCurveTo(-43,27,-64,26,-65,9);s.lineTo(-65,-38);s.quadraticCurveTo(-65,-49,-58,-49);
  }else{
   s.moveTo(-57,-43);s.lineTo(-41,-43);s.quadraticCurveTo(-34,-41,-24,-41);s.lineTo(52,-41);s.quadraticCurveTo(61,-39,61,-31);s.lineTo(61,14);s.bezierCurveTo(60,26,48,25,36,29);s.bezierCurveTo(28,31,31,42,23,43);s.lineTo(-7,43);s.bezierCurveTo(-15,42,-13,27,-21,27);s.lineTo(-38,27);s.bezierCurveTo(-46,28,-55,20,-60,16);s.lineTo(-61,-37);s.quadraticCurveTo(-61,-43,-57,-43);
  }return s;
 }
 const body=outline();const aperture=new T.Path();aperture.absarc(mx,my,r-3.3,0,Math.PI*2,true);body.holes.push(aperture);extrude(body,depth,-depth/2,'body',1.1);
 // Rubber grip: an asymmetric loft, with independent cross-sections per camera.
 function grip(sections){const n=48,pos=[],uv=[],indices=[];sections.forEach(([y,cx,rx,cz,rz],j)=>{for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;pos.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);uv.push(i/n*25,j/(sections.length-1)*25);}});for(let j=0;j<sections.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return add(g,'rubber',0,0,0);}
 if(id==='m50')grip([[-39,-44,12,10,9],[-36,-44,13,11,10],[-20,-45,12,13,13],[0,-45,12,13,14],[18,-44,13,10,12],[22,-43,12,8,10]]);
 else if(id==='850d')grip([[-48,-46,16,15,17],[-43,-46,18,17,20],[-22,-48,17,23,22],[0,-49,17,24,25],[16,-48,17,22,25],[23,-44,15,18,22]]);
 else grip([[-42,-44,17,15,20],[-37,-44,18,17,23],[-19,-47,15,23,25],[1,-46,17,24,28],[16,-43,19,23,27],[22,-40,18,21,24]]);
 // Grip top follows the shutter's forward projection, rather than a flat block.
 const cap=rounded(id==='m50'?26:33,9,id==='m50'?25:42,id==='m50'?-44:-45,id==='m50'?22:24,id==='m50'?12:23,8,'body');cap.rotation.z=id==='m50'?0:.12;
 if(id!=='m50'){const patch=new T.Shape();patch.moveTo(mx+r-2,bottom+2);patch.lineTo(w/2-3,bottom+2);patch.quadraticCurveTo(w/2,bottom+2,w/2-2,bottom+8);patch.lineTo(w/2-3,13);patch.lineTo(mx+r-1,15);patch.closePath();extrude(patch,1,f+.2,'rubber',.8);}
 // Closed flash: independently curved silhouettes, extending forward over mount.
 const hood=new T.Shape();
 if(id==='m50'){hood.moveTo(-16,24);hood.bezierCurveTo(-12,30,-14,39,-8,40);hood.lineTo(20,40);hood.bezierCurveTo(25,38,24,29,29,24);hood.quadraticCurveTo(5,20,-16,24);}
 else if(id==='850d'){hood.moveTo(-23,27);hood.bezierCurveTo(-19,37,-15,45,-7,46);hood.quadraticCurveTo(8,48,23,45);hood.bezierCurveTo(30,41,31,31,35,27);hood.bezierCurveTo(20,22,-6,22,-23,27);}
 else{hood.moveTo(-13,27);hood.bezierCurveTo(-9,36,-10,40,-3,40);hood.lineTo(24,40);hood.quadraticCurveTo(28,39,31,29);hood.quadraticCurveTo(9,24,-13,27);}
 extrude(hood,id==='850d'?15:6,f-3,'body',1.8);
 label('Canon',id==='850d'?34:30,10,id==='m50'?6:9,id==='m50'?33:35,f+(id==='850d'?14:5),95,'Georgia');
 // Bayonet hole is open through the front shell; interior surfaces sit behind it.
 const tube=add(new T.CylinderGeometry(r-3.5,r-3.5,depth+7,96,1,true),new T.MeshBasicMaterial({color:0x050608,side:T.BackSide}),mx,my,0);tube.rotation.x=Math.PI/2;
 add(new T.CircleGeometry(r-3.4,96),new T.MeshBasicMaterial({color:0x040609}),mx,my,f-5);
 const sensorMap=tex(512,320,(c,W,H)=>{c.fillStyle='#475366';c.fillRect(0,0,W,H);const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#031113');g.addColorStop(.45,'#052d31');g.addColorStop(1,'#01090c');c.fillStyle=g;c.fillRect(8,8,W-16,H-16);c.strokeStyle='#23657c';c.lineWidth=4;c.strokeRect(11,11,W-22,H-22);});
 if(id==='850d'){
  rounded(33,28,2,mx,my,-2,1,'edge');const mirrorMap=tex(256,192,(c,W,H)=>{const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#263136');g.addColorStop(.4,'#b4c1bf');g.addColorStop(.65,'#e7e8e1');g.addColorStop(1,'#69797d');c.fillStyle=g;c.fillRect(0,0,W,H);});const mirror=add(new T.PlaneGeometry(26,22),new T.MeshStandardMaterial({map:mirrorMap,roughness:.23,metalness:.3}),mx,my,f-4.7);mirror.rotation.x=-.25;
  for(const yy of [-17,17])rounded(35,2.3,12,mx,my+yy,6,1,'black');for(const xx of [-18,18])rounded(2,32,12,mx+xx,my,6,1,'edge');
 }else add(new T.PlaneGeometry(24,16),new T.MeshBasicMaterial({map:sensorMap}),mx,my,f-4.8);
 add(new T.RingGeometry(r-3.3,r+1.7,96),'silver',mx,my,f+3.5);ring(r+1.8,.35,mx,my,f+3.3,'edge');ring(r-3.3,.35,mx,my,f+3.6,'black');
 // Fine concentric machining marks and bayonet lugs.
 ring(r+.8,.04,mx,my,f+3.6,'edge');
 for(const a of [.1,2.1,4.25]){const lug=add(new T.RingGeometry(r-4.8,r-2.9,32,1,a,.43),'silver',mx,my,f+3.8);}
 const screwAngles=id==='m50'?[.05,.58,2.52,3.77,5.48]:id==='850d'?[.1,.75,2.45,3.73,5.47]:[.05,1.3,2.2,3.95,5.6];
 screwAngles.forEach(a=>{const x=mx+Math.cos(a)*(r-.5),y=my+Math.sin(a)*(r-.5);cyl(1.2,.7,x,y,f+3.7,'edge');cyl(.85,.2,x,y,f+4.05,'silver');rounded(1.1,.18,.1,x,y,f+4.2,.04,'black');rounded(.18,1.1,.1,x,y,f+4.2,.04,'black');});
 for(let i=0;i<(id==='r10'?12:9);i++){const a=4.21+i*.09;cyl(.6,.5,mx+Math.cos(a)*(r-5.4),my+Math.sin(a)*(r-5.4),f-.5,'gold');}
 if(id==='m50')cyl(1.25,.5,mx-10,my+r-.5,f+3.8,'white');else{cyl(1.2,.5,mx,my+r-.5,f+3.8,'red');if(id==='850d')rounded(1.4,1.4,.6,mx+10,my+r-1.5,f+3.7,.1,'white');}
 if(id==='m50'){cyl(3.7,2,mx+r+9,my,f+1,'edge');label('EOS',17,7,46,-31,f+3.6,80);cyl(2.1,.5,47,15,f+3.6,'glass');}
 else{const rel=rounded(7,12,3,mx+r+6,my+2,f+1,3,'edge');label('EOS',15,7,w/2-14,20,f+4,78);rounded(17,9,1,w/2-13,10,f+1,2,'edge');label(id==='r10'?'R10':'850D',15,7,w/2-13,10,f+4,76);cyl(2.1,1,-21,21,f+2,'white');}
 if(id==='r10'){cyl(5.3,3,-18,-31,f+5,'edge');cyl(3.2,3.5,-18,-31,f+6,'black');label('AF MF',13,4,-18,-23,f+7,68);const lever=rounded(2.5,5,2,-14,-35,f+7,1,'edge');lever.rotation.z=.5;}
 // Different top control layouts: M50 shutter-ring; 850D wheel; R10 dual dials.
 function dial(x,y,z,radius,mode){cyl(radius,3.5,x,y,z,'black',true);for(let i=0;i<56;i++){const a=i*Math.PI/28;const b=rounded(.48,3,.5,x+Math.cos(a)*radius,y,z+Math.sin(a)*radius,.12,'edge');b.rotation.y=-a;}
  if(mode){const map=tex(256,256,(c,W,H)=>{c.fillStyle='#151619';c.fillRect(0,0,W,H);c.textAlign='center';c.font='23px Arial';['M','Av','Tv','P','A+','SCN','▣'].forEach((t,i)=>{const a=i*2*Math.PI/7;c.save();c.translate(128+Math.cos(a)*82,128+Math.sin(a)*82);c.rotate(a+Math.PI/2);c.fillStyle=t==='A+'?'#37c7ad':'#ddd';c.fillText(t,0,8);c.restore();});});const face=add(new T.CircleGeometry(radius-.5,64),new T.MeshBasicMaterial({map}),x,y+1.85,z);face.rotation.x=-Math.PI/2;}}
 if(id==='m50'){dial(-37,27,-8,9,true);dial(-43,27,19,8,false);cyl(5,1,-43,29.5,19,'black',true);cyl(2,1,-54,26,15,'red',true);}
 else if(id==='850d'){dial(-37,29,-10,10,true);const wheel=cyl(6,3,-46,29,20,'edge');wheel.rotation.z=Math.PI/2;cyl(5,1.5,-48,30,36,'black',true);[-33,-43,-54].forEach(x=>cyl(2.1,1,x,29,5,'black',true));}
 else{dial(-27,31,-9,9,true);dial(-48,28,-9,8,false);const wheel=cyl(6,3,-44,31,24,'edge');wheel.rotation.z=Math.PI/2;cyl(5,1.4,-44,31,41,'black',true);cyl(2.5,1,-30,31,12,'red',true);cyl(2.5,1,-44,30,7,'black',true);}
 rounded(21,1,18,5,top+1,-6,1,'black');for(const x of [-4,14])rounded(2,2,18,x,top+2,-6,.5,'silver');for(let i=0;i<5;i++)cyl(.7,.3,2+(i%2)*6,top+2,-9+Math.floor(i/2)*4,'silver',true);
 // Back and terminal side features, not a reused generic camera back.
 const screenW=id==='m50'?81:id==='850d'?81:78,screenY=id==='m50'?-8:id==='850d'?-17:-12;
 rounded(screenW,53,3,-10,screenY,-depth/2-2,3,'edge');rounded(screenW-4,49,1,-10,screenY,-depth/2-4,2,'black');
 rounded(id==='m50'?29:34,id==='850d'?24:21,9,5,id==='850d'?27:29,-depth/2-3,6,'rubber');rounded(18,12,1,5,id==='850d'?27:29,-depth/2-8,2,'glass');
 [12,0,-13,-29].forEach((y,i)=>cyl(i===2?7:2.7,2,w/2-14,y,-depth/2-3,'edge'));if(id==='r10')cyl(4,3,30,22,-depth/2-4,'rubber');
 for(const x of [-w/2,w/2]){const lug=ring(3,1,x,20,-2);lug.rotation.y=Math.PI/2;}
 const cover=rounded(1.5,35,16,w/2+.5,-10,-2,2,id==='m50'?'body':'rubber');
 return spec;
}
