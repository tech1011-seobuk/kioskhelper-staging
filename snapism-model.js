import * as T from './three.module.js';

// Photo reference: KakaoTalk_20260928_143123669, 22 views, 2026-09-28.
// Metre-scale proportions are estimated from photographs, not fabrication measurements.
export function createSnapismModel(){
 const root=new T.Group();root.name='snapism_kiosk';
 const mat=(color,roughness=.55,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const white=mat('#ecebe5',.48),edge=mat('#d9dbd6',.55),black=mat('#15171a',.5),slot=mat('#090b0e',.8),silver=mat('#aeb4b7',.21,.85),grey=mat('#9b9f9e'),strap=mat('#202124',.95);
 const blue=mat('#127ded'),red=mat('#c51b33'),green=new T.MeshStandardMaterial({color:'#58e573',emissive:'#1baf39',emissiveIntensity:1});
 function box(p,n,x,y,z,w,h,d,m,r=0){
  let geo;
  if(r){const s=new T.Shape();const a=-w/2,b=-h/2;r=Math.min(r,w/2,h/2);s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.0015,bevelSize:.0015,bevelSegments:2,steps:1,curveSegments:5});geo.translate(0,0,-d/2);}else geo=new T.BoxGeometry(w,h,d);
  const o=new T.Mesh(geo,m);o.name=n;o.position.set(x,y,z);p.add(o);return o;
 }
 function disc(p,n,x,y,z,r,d,m){const o=new T.Mesh(new T.CylinderGeometry(r,r,d,20),m);o.rotation.x=Math.PI/2;o.position.set(x,y,z);o.name=n;p.add(o);return o;}
 function text(p,n,txt,x,y,z,w,h,bg,fg,size=60){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,192);ctx.fillStyle=fg;ctx.font=`${size}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,384,100,740);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}));o.name=n;o.position.set(x,y,z);p.add(o);return o;}
 function screws(p,x,y,z,w,h){for(const a of [-1,1])for(const b of [-1,1]){disc(p,'fastener',x+a*w/2,y+b*h/2,z,.003,.002,silver);box(p,'screw_slot',x+a*w/2,y+b*h/2,z+.0015,.003,.0007,.0005,black);}}
 function vents(p,x,y,z,cols,rows,step=.014){for(let a=0;a<cols;a++)for(let b=0;b<rows;b++)box(p,'vent',x+(a-(cols-1)/2)*step,y+(b-(rows-1)/2)*step,z,.008,.003,.001,slot,.001);}
 // Thin folded white panels, fixed cabinet and shelves; right-hinged split front doors.
 box(root,'left_panel',-.337,1.06,-.06,.018,1.97,.54,white);
 box(root,'right_panel',.337,1.06,-.06,.018,1.97,.54,white);
 box(root,'back_panel',0,1.06,-.326,.656,1.97,.014,edge);
 for(const y of [.08,.56,1.10,1.66,2.05]){box(root,'shelf',0,y,-.06,.656,.018,.54,white);box(root,'shelf_fold',0,y-.018,.2,.656,.033,.014,white);}
 for(const x of [-.31,.31]){box(root,'front_frame',x,1.065,.215,.025,1.96,.024,white);for(const y of [.06,2.03])screws(root,x,y,.231,.005,.012);}
 for(const x of [-.28,.28])for(const z of [-.26,.17]){const wheel=disc(root,'caster',x,.036,z,.025,.018,grey);wheel.rotation.z=Math.PI/2;box(root,'caster_bracket',x,.061,z,.018,.03,.02,silver);}
 box(root,'illuminated_header',0,1.982,.23,.685,.16,.056,white,.009);
 box(root,'lightbox',0,1.99,.262,.596,.115,.006,new T.MeshStandardMaterial({color:'#ffffff',emissive:'#fff7ec',emissiveIntensity:1.1}),.024);
 text(root,'snapism_sign','snapism',0,1.99,.267,.50,.101,'#fffdf6','#ec5b72',104);
 const door=new T.Group();door.name='kiosk_front_door';door.position.set(.339,0,.244);root.add(door);
 const front=new T.Group();front.position.x=-.339;door.add(front);
 // Upper screen door: actual aperture with inset glass, chrome lock and speaker holes.
 box(front,'upper_door_left',-.276,1.447,0,.12,.898,.022,white,.003);
 box(front,'upper_door_right',.276,1.447,0,.12,.898,.022,white,.003);
 box(front,'upper_door_top',0,1.852,0,.444,.088,.022,white,.003);
 box(front,'upper_door_bottom',0,1.044,0,.444,.092,.022,white,.003);
 box(front,'monitor_body',0,1.461,-.035,.455,.775,.065,black,.003);
 box(front,'glass_bezel',0,1.457,.003,.443,.757,.009,slot);
 // Deliberately neutral brand display; do not reproduce changing event artwork or reflections.
 const screen=document.createElement('canvas');screen.width=540;screen.height=960;const s=screen.getContext('2d');s.fillStyle='#151319';s.fillRect(0,0,540,960);s.fillStyle='#ed3c59';s.font='64px Arial';s.textAlign='center';s.fillText('snapism',270,400);s.font='20px Arial';s.fillStyle='#c6bfc6';s.fillText('PHOTO CARD & STICKER',270,450);s.fillStyle='#c71d39';s.fillRect(0,832,540,128);s.fillStyle='#ffffff';s.font='24px sans-serif';s.fillText('화면 터치로 시작',270,888);s.font='16px Arial';s.fillText('Touch to Start',270,920);const screenMap=new T.CanvasTexture(screen);screenMap.colorSpace=T.SRGBColorSpace;const display=new T.Mesh(new T.PlaneGeometry(.425,.735),new T.MeshBasicMaterial({map:screenMap}));display.position.set(0,1.46,.009);front.add(display);
 for(const x of [-.28,.28])for(let a=0;a<4;a++)for(let b=0;b<7;b++)disc(front,'speaker_hole',x+(a-1.5)*.009,1.065+(b-3)*.01,.013,.0016,.001,slot);
 function handle(y){box(front,'lock_recess',-.285,y,.014,.029,.131,.008,slot,.006);box(front,'chrome_lock_plate',-.285,y,.02,.032,.128,.009,silver,.004);box(front,'folding_handle',-.285,y+.011,.029,.021,.090,.012,silver,.009);disc(front,'keyhole',-.285,y-.043,.028,.007,.003,black);box(front,'key_slot',-.285,y-.043,.030,.001,.009,.001,silver);}
 handle(1.46);handle(.645);
 // Lower door is assembled around two genuine output apertures, not painted-on rectangles.
 const cut=[{x:.10,y:.83,w:.205,h:.071},{x:.095,y:.338,w:.245,h:.074}];
 const shape=new T.Shape();shape.moveTo(-.335,.097);shape.lineTo(.335,.097);shape.lineTo(.335,.994);shape.lineTo(-.335,.994);shape.closePath();
 for(const q of cut){const h=new T.Path();h.moveTo(q.x-q.w/2,q.y-q.h/2);h.lineTo(q.x-q.w/2,q.y+q.h/2);h.lineTo(q.x+q.w/2,q.y+q.h/2);h.lineTo(q.x+q.w/2,q.y-q.h/2);h.closePath();shape.holes.push(h);box(front,'output_tray',q.x,q.y-q.h/2,-.027,q.w,.006,.065,edge);}
 const lower=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.021,bevelEnabled:false}),white);lower.position.z=-.011;front.add(lower);
 // NICE NR-5500, raised pad, display, card slit and illuminated status.
 box(front,'terminal_mount',-.237,.827,.016,.13,.20,.01,white,.018);
 box(front,'NR5500',-.237,.827,.041,.063,.17,.048,black,.009);
 box(front,'terminal_screen',-.237,.877,.066,.043,.048,.002,slot,.003);
 box(front,'terminal_display_reflection',-.237,.885,.068,.031,.002,.001,grey);
 box(front,'card_slot',-.237,.788,.068,.035,.054,.006,silver,.003);
 box(front,'card_slot_dark',-.237,.788,.072,.026,.046,.003,slot,.002);
 disc(front,'terminal_status',-.23,.843,.068,.0028,.002,green);
 box(front,'terminal_side',-.199,.827,.044,.009,.164,.046,black,.003);
 // Visible back of opened monitor door, brackets and control enclosure.
 for(const x of [-.245,.245])for(const y of [1.15,1.73]){box(front,'monitor_bracket',x,y,-.067,.042,.104,.012,white,.005);screws(front,x,y,-.075,.02,.074);}
 box(front,'monitor_electronics',0,1.48,-.084,.29,.51,.036,black);vents(front,0,1.6,-.104,12,5);
 for(const y of [1.19,1.35,1.78]){box(root,'hinge',.335,y,.24,.014,.055,.027,silver);}
 // CX7600: rear-facing housing from the front service opening, feed hopper behind.
 box(root,'CX7600',.035,1.36,-.025,.405,.405,.315,white,.017);
 box(root,'CX_seam',.10,1.36,.134,.0015,.362,.001,grey);
 for(const [y,w,h] of [[1.45,.158,.013],[1.395,.04,.017],[1.22,.033,.013]])box(root,'CX_housing_recess',.158,y,.135,w,h,.008,slot,.002);
 box(root,'CX_retaining_strap',-.098,1.365,.138,.049,.397,.007,strap);
 box(root,'CX_top_strap',-.098,1.565,-.025,.049,.006,.315,strap);
 box(root,'CX_base',.035,1.137,-.025,.44,.021,.37,white);
 box(root,'CX_retainer',-.10,1.184,.153,.080,.068,.012,white,.004);
 box(root,'CX_strap_over_retainer',-.10,1.183,.161,.045,.055,.003,strap);
 disc(root,'CX_base_pin',.094,1.132,.174,.011,.022,black);
 const hopper=mat('#262448',.24);box(root,'purple_card_hopper',-.092,1.615,-.15,.135,.152,.11,hopper,.005);
 // DS620 and PC match photographs 02/03, left PC and right printer.
 box(root,'PC',-.18,.802,-.02,.10,.41,.32,black,.003);
 vents(root,-.18,1.009,-.04,5,7);
 disc(root,'PC_power_ring',-.18,.949,.144,.014,.003,blue);disc(root,'PC_power',-.18,.949,.147,.008,.002,silver);
 for(const x of [-.198,-.168])for(const y of [.66,.71]){box(root,'USB_surround',x,y,.145,.009,.018,.004,silver);box(root,'USB_socket',x,y,.148,.005,.013,.002,slot);}
 box(root,'DS620',.088,.767,-.023,.335,.281,.337,grey,.009);
 box(root,'DS620_face',.088,.77,.149,.328,.261,.012,white,.008);
 box(root,'DS620_output',.09,.851,.158,.258,.009,.01,slot,.003);
 text(root,'DNP_label','DNP',.095,.888,.158,.07,.026,'#ecebe5','#183e77',78);
 box(root,'DS620_bin',.113,.741,.169,.259,.135,.042,black,.008);
 box(root,'DS620_bin_lip',.113,.679,.194,.243,.009,.012,grey,.003);
 for(let i=0;i<4;i++)box(root,'DS620_status',-.052,.788-i*.018,.157,.011,.003,.002,i?black:green,.001);
 text(root,'DS620_model','DS620',-.051,.817,.158,.038,.014,'#ecebe5','#25272c',65);
 // Bottom coin/settings enclosure. The round lock above is NOT a service button.
 box(root,'coin_settings_box',-.205,.277,.025,.185,.29,.27,white,.003);
 box(root,'coin_box_seam',-.205,.303,.162,.174,.002,.001,grey);
 disc(root,'coin_box_lock',-.247,.358,.165,.013,.004,silver);box(root,'coin_box_keyslot',-.247,.358,.168,.013,.002,.001,slot);
 text(root,'coin_label','Coin',-.244,.274,.163,.064,.026,'#f6f6ef','#1264c2',65);
 text(root,'setting_label','Setting',-.166,.274,.163,.064,.026,'#f6f6ef','#bc1838',54);
 for(const [x,m] of [[-.244,blue],[-.166,red]]){disc(root,'button_bezel',x,.243,.166,.014,.008,black);disc(root,'service_button',x,.243,.173,.011,.009,m);}
 box(root,'breaker_recess',-.205,.182,.163,.066,.058,.004,slot);box(root,'breaker',-.205,.182,.168,.039,.049,.012,white);box(root,'breaker_switch',-.205,.186,.178,.01,.025,.008,black);screws(root,-.205,.183,.178,.072,.07);
 // Side-mounted amplifier, adapters and power strip; restrained wiring as in references.
 box(root,'amplifier',-.278,1.315,-.03,.065,.17,.19,black,.004);
 for(let i=0;i<4;i++)disc(root,'amplifier_knob',-.25,1.36-i*.031,.068,.007,.012,i===2?blue:black);
 box(root,'power_strip',-.295,1.53,-.12,.034,.043,.29,white,.006);
 for(let i=0;i<3;i++)box(root,'power_adapter',-.284,1.37,-.21+i*.081,.051,.17,.061,black,.004);
 box(root,'bottom_empty_mount',.12,.123,.02,.235,.025,.28,white);
 return root;
}

export const snapismAnchors={'모니터':[0,1.46,.26],'카드리더기':[-.237,.827,.31],'CX7600':[.035,1.36,.14],'DS620':[.088,.77,.19],'PC':[-.18,.86,.145],'서비스코인 / 설정':[-.205,.25,.17],'카메라':[0,1.5,.2]};
