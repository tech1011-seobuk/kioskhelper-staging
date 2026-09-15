"""PHOTOISM cabinet, original Blender reconstruction from supplied drawings/photos.
Blender --background --python kiosk-blender-build.py -- OUTPUT_DIRECTORY [--no-render]
Input metres: x=right, y=up, z=front. No reference photographs or serial labels embedded.
"""
import bpy, sys, os, math
from mathutils import Vector
from math import pi
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def v(p):return Vector((p[0],-p[2],p[1]))
def material(name,c,rough=.5,metal=0,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
 return m
body=material('Black powder coated steel',(.004,.0045,.005),.68,.10)
edge=material('Folded black steel edges',(.012,.014,.017),.4,.38)
rubber=material('Cable and rubber',(.003,.004,.005),.75)
silver=material('Brushed monitor aluminium',(.37,.40,.42),.31,.75)
bright=material('Zinc plated brackets',(.52,.55,.56),.28,.78)
black=material('Black plastic housings',(.007,.009,.011),.38)
glass=material('Black monitor glass',(.002,.003,.004),.2,.12)
white=material('Printed white labels',(.8,.81,.79),.6)
light=material('Diffused white light',(.88,.93,1),.3,0,2)
green=material('Green status LED',(.03,.5,.006),.25,0,1)
blue=material('Blue controls',(.005,.2,.6),.32)
red=material('Red controls',(.5,.006,.009),.35)
brass=material('Screw steel',(.42,.38,.26),.32,.75)
def group(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
shell=group('Kiosk shell');inside=group('Kiosk internal equipment');doors=group('kiosk_rear_doors')
def finish(o,name,m,r=0,parent=shell):
 o.name=name;o.data.materials.append(m);o.parent=parent
 if r:
  mod=o.modifiers.new('Manufactured edge radius','BEVEL');mod.width=r;mod.segments=3
 if o.type=='MESH':
  n=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');n.keep_sharp=True
 return o
def box(name,p,size,m=body,r=.001,parent=shell,angle=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=v(p));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler.x=angle;return finish(o,name,m,r,parent)
def cyl(name,p,r,depth,m=silver,axis='Z',parent=shell,N=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=N,radius=r,depth=depth,location=v(p));o=bpy.context.object
 if axis=='Z':o.rotation_euler.x=pi/2
 elif axis=='X':o.rotation_euler.y=pi/2
 return finish(o,name,m,.00035,parent)
def label(name,text,p,w,h,m=white,parent=shell,back=False,angle=0):
 c=bpy.data.curves.new(name,'FONT');c.body=text;c.align_x='CENTER';c.align_y='CENTER';c.size=h;c.resolution_u=3
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=v(p);o.rotation_euler=(pi/2+angle,0,pi if back else 0);o.parent=parent;c.materials.append(m)
 bpy.context.view_layer.update()
 if o.dimensions.x>w:o.scale.x=w/o.dimensions.x
 return o
def screws(name,points,back=False,parent=inside):
 # One mesh for all hardware instances avoids hundreds of dependency graph updates.
 verts=[];faces=[]
 for x,y,z in points:
  n=len(verts);N=12
  for dz in [-.001,.001]:
   for i in range(N):
    a=2*pi*i/N;verts.append(v((x+.003*math.cos(a),y+.003*math.sin(a),z+dz)))
  faces.append(tuple(n+i for i in range(N)));faces.append(tuple(n+N+i for i in range(N)))
  for i in range(N):faces.append((n+i,n+(i+1)%N,n+(i+1)%N+N,n+i+N))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=parent;mesh.materials.append(bright)
def vents(name,p,cols,rows,step=.006,side=False):
 verts=[];faces=[]
 for col in range(cols):
  for row in range(rows):
   x,y,z=p;n=len(verts)
   for dx,dy in [(-.001,-.002),(.001,-.002),(.001,.002),(-.001,.002)]:
    verts.append(v((x,y+row*step+dy,z+col*step+dx) if side else (x+col*step+dx,y+row*step+dy,z)))
   faces.append((n,n+1,n+2,n+3))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=inside;mesh.materials.append(rubber)
def panel(name,y1,z1,y2,z2):
 a=math.atan2(z2-z1,y2-y1);box(name,(0,(y1+y2)/2,(z1+z2)/2),(.802,math.hypot(y2-y1,z2-z1),.012),body,.002,angle=a);return a

# Folded side profile from supplied 850 x 500 x 1982 drawing.
profile=[(.25,.082),(.25,1.082),(.05,1.362),(.05,1.772),(.135,1.982),(-.25,1.982),(-.25,.082)]
for x in [-.425,.413]:
 verts=[v((xx,y,z)) for xx in [x,x+.012] for z,y in profile];N=len(profile)
 faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 mesh=bpy.data.meshes.new('Side profile');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Folded side wall',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,body,.002)
box('Cabinet roof',(0,1.974,-.0575),(.826,.016,.385),body,.003)
box('Cabinet bottom',(0,.1,0),(.826,.03,.5),body,.002)
box('Front service door',(0,.593,.25),(.790,.949,.014),body,.002)
angle=panel('Sloped monitor surround',1.082,.25,1.362,.05)
panel('Camera front panel',1.362,.05,1.772,.05)
upper=panel('Upper light surround',1.772,.05,1.982,.135)
box('Upper diffuser',(0,1.872,.104),(.57,.105,.008),light,.006,angle=upper)
label('PHOTOISM','PHOTOISM',(0,1.872,.11),.35,.031,black,angle=upper)
for x in [-.315,.315]:
 box('Vertical light surround',(x,1.558,.06),(.065,.36,.018),edge,.019)
 box('Vertical light diffuser',(x,1.558,.073),(.044,.325,.007),light,.02)
for r,d,z,m in [(.037,.009,.065,silver),(.031,.02,.078,black),(.023,.006,.091,glass),(.008,.002,.095,black)]:cyl('Camera front aperture',(0,1.548,z),r,d,m)
box('LOOK HERE label backing',(0,1.641,.06),(.17,.032,.001),rubber,.002)
label('Camera marker','LOOK HERE!',(0,1.642,.062),.15,.021)
box('Monitor bezel',(0,1.226,.165),(.536,.263,.018),edge,.004,angle=angle)
box('Monitor black display',(0,1.232,.179),(.497,.225,.002),glass,.002,angle=angle)
box('Remote body',(.337,1.238,.175),(.044,.102,.02),black,.006,angle=angle)
for i in range(4):cyl('Remote key',(.337,1.213+i*.017,.197-i*.006),.004,.003,silver)
box('How to use printed panel',(0,1.01,.260),(.72,.079,.001),black,.001)
label('How to use heading','HOW TO USE',(-.255,1.031,.262),.15,.013)
for i in range(6):
 x=-.295+i*.118;label('Instruction step',str(i+1),(x,.999,.262),.02,.019)
 box('Instruction line',(x+.025,1.005,.262),(.04,.002,.0005),white,0)
 box('Instruction line',(x+.025,.995,.262),(.04,.002,.0005),white,0)
box('Banknote metal guide',(-.25,.86,.27),(.092,.03,.028),silver,.003)
box('Banknote slot',(-.25,.86,.286),(.075,.006,.002),rubber,.001)
box('Card terminal',(-.065,.834,.279),(.045,.099,.044),black,.007)
box('Card slot',(-.065,.817,.303),(.029,.004,.002),rubber,.001)
label('Card label','CARD',(-.065,.854,.303),.035,.008)
cyl('Card terminal LED',(-.065,.866,.303),.002,.001,green)
box('Front door key escutcheon',(-.277,.612,.264),(.048,.065,.014),silver,.003)
cyl('Service coin cylinder',(-.277,.626,.279),.011,.018,silver)
box('Front door key slot',(-.277,.626,.29),(.002,.013,.001),rubber,.0002)
box('Photo output surround',(.175,.615,.265),(.229,.073,.015),black,.004)
box('Photo output slot',(.175,.635,.275),(.205,.006,.002),rubber,.001)
box('Photo output lip',(.175,.63,.279),(.208,.006,.01),silver,.001)
for y in [.33,.82]:box('Front door hinge',(.395,y,.246),(.017,.065,.015),bright,.002)
for x in [-.35,.35]:
 for z in [-.173,.173]:
  cyl('Caster tyre',(x,.041,z),.034,.024,rubber,'X')
  cyl('Caster metal hub',(x,.041,z),.02,.026,silver,'X')
  box('Caster fork',(x,.064,z),(.03,.04,.047),bright,.004)
  box('Caster mounting plate',(x,.085,z),(.052,.008,.064),silver,.002)

# Rear door panels are one independent group, hidden only in internal view.
for y,h in [(1.477,.948),(.58,.80)]:
 box('Rear removable cover',(0,y,-.248),(.788,h,.014),body,.003,doors)
 for yy in [y-h*.43,y+h*.43]:box('Rear cover inner stiffener',(0,yy,-.239),(.72,.022,.012),edge,.001,doors)
 cyl('Rear quarter turn latch',(.31,y+h*.34,-.26),.009,.006,bright,parent=doors)
 for x in [-.38,.38]:box('Rear door hinge',(x,y,-.245),(.018,.065,.02),silver,.002,doors)

# Rear frame, internal rails and fixing holes.
for x in [-.397,.397]:
 box('Rear vertical frame',(x,1.025,-.232),(.028,1.855,.033),edge,.001,inside)
 box('Frame return flange',(x,1.025,-.215),(.051,1.855,.008),body,.001,inside)
for y,h in [(.12,.032),(.998,.055),(1.948,.03)]:box('Rear transverse frame',(0,y,-.226),(.788,h,.037),edge,.001,inside)
screws('Rear frame fixings',[(x,y,-.254) for x in [-.397,.397] for y in [.18,.40,.62,.85,1.08,1.32,1.58,1.84]])
for y in [.408,.734]:
 box('Equipment shelf',(0,y,-.015),(.777,.013,.436),body,.001,inside)
 box('Shelf rear turned lip',(0,y+.013,-.228),(.777,.023,.009),edge,.001,inside)
 screws('Shelf fixing screws',[(x,y+.012,-.227) for x in [-.34,-.22,.22,.34]])
box('Camera assembly cross rail',(0,1.353,-.062),(.734,.025,.210),edge,.001,inside)
box('Camera rail folded lip',(0,1.367,-.17),(.73,.028,.006),body,.001,inside)

# Upper light rear aluminium heatsink and securing straps.
box('Upper light rear casing',(0,1.855,-.023),(.60,.105,.105),silver,.004,inside,upper)
for y in [1.821,1.837,1.853,1.869,1.885]:box('Upper light extrusion ridge',(0,y,-.077),(.566,.004,.004),bright,.0006,inside)
for x in [-.29,.29]:
 box('Upper light mounting bracket',(x,1.865,-.03),(.019,.13,.09),edge,.001,inside)
screws('Upper bracket bolts',[(x,y,-.077) for x in [-.29,.29] for y in [1.823,1.892]])
box('Upper light retaining band',(0,1.9,-.081),(.618,.027,.012),body,.001,inside)
for x in [-.315,.315]:
 box('LED rear aluminium carrier',(x,1.558,.03),(.068,.369,.024),silver,.001,inside)
 for dx in [-.018,0,.018]:box('LED rear luminous strip',(x+dx,1.558,.011),(.008,.326,.004),light,.002,inside)
 for dx in [-.033,.033]:box('LED cage side rail',(x+dx,1.558,-.003),(.009,.372,.014),edge,.001,inside)
 for y in [1.389,1.478,1.585,1.731]:box('LED cage cross rail',(x,y,-.006),(.073,.009,.017),edge,.001,inside)
 screws('LED carrier fixings',[(x,y,-.01) for y in [1.405,1.70]])

# Camera cradle, adjustment knobs and an existing detailed Canon body.
box('Camera base plate',(0,1.403,-.04),(.20,.012,.153),edge,.001,inside)
box('Camera pedestal',(0,1.444,-.025),(.095,.079,.09),body,.003,inside)
box('Camera tilt platform',(0,1.487,-.026),(.15,.012,.097),black,.002,inside)
for x in [-.081,.081]:
 cyl('Camera tilt adjustment knob',(x,1.465,-.015),.014,.015,black,'X',inside)
 for i in range(12):
  a=2*pi*i/12;box('Adjustment knob grip',(x,1.465+.013*math.sin(a),-.015+.013*math.cos(a)),(.016,.003,.003),edge,.0004,inside)
screws('Camera mount bolts',[(x,1.423,-.055) for x in [-.038,.038]])
def import_asset(path,name,width,center,decimate=None):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'assets',path));objects=[o for o in bpy.data.objects if o not in before];meshes=[o for o in objects if o.type=='MESH']
 pts=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));factor=width/(hi.x-lo.x);mid=(lo+hi)/2
 for o in meshes:
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
  for vert in o.data.vertices:vert.co=(world@vert.co-mid)*factor+v(center)
  o.matrix_world.identity();o.parent=inside;o.name=name+' '+o.name
  if decimate:
   mod=o.modifiers.new('Cabinet scale detail reduction','DECIMATE');mod.ratio=decimate
 for o in objects:
  if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
import_asset('camera-r10.glb','Installed camera',.13,(0,1.543,-.015),.3)
box('Flash sync adapter',(0,1.605,-.013),(.035,.023,.031),black,.003,inside)
box('Flash sync foot',(0,1.591,-.013),(.021,.008,.02),bright,.001,inside)

# Rear monitor: sloping metal shell, reinforcement and controls observed in photos.
box('Monitor rear metal shell',(0,1.224,.112),(.56,.271,.042),silver,.002,inside,angle)
box('Monitor rear electronics housing',(0,1.235,.079),(.425,.111,.034),silver,.002,inside,angle)
box('Monitor horizontal retaining bracket',(0,1.17,.049),(.611,.055,.018),body,.001,inside,angle)
for x in [-.289,.289]:box('Monitor side support',(x,1.23,.09),(.021,.272,.065),edge,.001,inside,angle)
for x in [-.234,.184]:vents('Monitor ventilation',(x,1.21,.062),9,3,.005)
for i in range(6):cyl('Monitor OSD button',(-.086+i*.028,1.259,.049),.005,.004,black,parent=inside)
cyl('Monitor power LED',(.054,1.259,.047),.003,.003,green,parent=inside)
label('Monitor OSD text','AUTO   MENU   LEFT   RIGHT   ON/OFF',(0,1.247,.047),.20,.007,black,inside,True)
screws('Monitor metal fixings',[(x,y,.064) for x in [-.25,.25] for y in [1.14,1.30]])

# Cash box and printer cavity. Printer rear faces the open back of the kiosk.
box('Cash collection cabinet',(-.268,.522,.029),(.258,.73,.355),body,.002,inside)
box('Cash cabinet front inset',(-.268,.5,.211),(.23,.664,.008),edge,.002,inside)
box('Cash cabinet handle',(-.193,.48,.228),(.019,.185,.023),black,.004,inside)
cyl('Cash cabinet lock',(-.265,.784,.22),.012,.009,bright,parent=inside)
box('Note acceptor back module',(-.268,.906,.119),(.099,.112,.117),black,.003,inside)
import_asset('printer-rx1.glb','Installed RX1 printer',.322,(.119,.564,-.012))

# Vertical PC with detailed rear I/O (six serial connectors, USB, LAN, audio, DC).
pcx=-.099
box('Industrial PC chassis',(pcx,.91,-.015),(.09,.33,.252),edge,.003,inside)
box('PC rear IO plate',(pcx,.91,-.146),(.087,.321,.008),black,.001,inside)
for i in range(6):
 y=1.048-i*.051
 box('Serial port metal rim',(pcx+.021,y,-.152),(.015,.030,.004),bright,.003,inside)
 box('Serial port insert',(pcx+.021,y,-.155),(.010,.023,.002),black,.001,inside)
 for j in range(5):cyl('Serial pin',(pcx+.02,y-.008+j*.004,-.157),.0007,.001,brass,parent=inside,N=8)
 screws('Serial securing nuts',[(pcx+.021,y-.021,-.155),(pcx+.021,y+.021,-.155)])
for y in [1.005,.958,.922]:
 box('USB dual metal socket',(pcx-.02,y,-.153),(.016,.026,.005),bright,.001,inside)
 for dy in [-.006,.006]:box('USB port opening',(pcx-.02,y+dy,-.157),(.011,.006,.001),rubber,.0005,inside)
box('LAN socket',(pcx-.02,.884,-.154),(.018,.019,.006),silver,.001,inside)
for x,y,m in [(pcx-.026,.86,green),(pcx-.026,.841,red)]:cyl('PC audio connector',(x,y,-.154),.004,.003,m,parent=inside)
cyl('DC inlet',(pcx-.023,.794,-.156),.007,.009,black,parent=inside)
vents('PC side louvers',(pcx-.046,.81,-.096),17,18,.009,True)
cyl('PC front power',(pcx,1.044,.117),.010,.003,blue,parent=inside)
label('PC rear designation','PC',(pcx,.764,-.152),.045,.015,white,inside,True)
for y in [.988,.965]:box('PC front USB',(pcx,y,.115),(.012,.006,.004),silver,.001,inside)

# Adapter rack on right when viewed from the rear (left in front coordinates).
for x,y,h,title in [(-.344,.617,.172,'PC'),(-.347,1.061,.11,'Monitor'),(-.347,1.212,.095,'Camera')]:
 box('Adapter mounting backplate '+title,(x,y,-.083),(.124,h+.03,.018),body,.001,inside)
 box('Power adapter '+title,(x,y,-.117),(.072,h,.045),black,.004,inside)
 box('Adapter retaining strap',(x,y-.026,-.145),(.081,.022,.005),rubber,.001,inside)
 box('Adapter label plate',(x,y+.04,-.142),(.047,.022,.001),white,.001,inside)
 label('Adapter label '+title,title,(x,y+.04,-.143),.043,.012,black,inside,True)
 cyl('Adapter status LED',(x,y+h*.39,-.142),.002,.002,green,parent=inside)

# Cables omitted at user request to keep the internal parts readable.
box('Bottom power panel',(0,.174,-.01),(.76,.065,.023),edge,.001,inside)
for x,txt,m in [(-.02,'Coin',blue),(.052,'Setting',red)]:
 cyl('Service button '+txt,(x,.174,.005),.008,.007,m,parent=inside);label('Service button label',txt,(x,.194,.005),.048,.008,white,inside)
box('Breaker housing',(.16,.173,.014),(.044,.063,.024),white,.002,inside)
box('Breaker toggle',(.16,.174,.03),(.013,.02,.009),black,.001,inside)

# Exportable subtle powder coat normal texture, independent of any supplied photograph.
import numpy as np
rng=np.random.default_rng(20260915);arr=rng.random((256,256));dy,dx=np.gradient(arr);norm=np.stack((-dx*.32,-dy*.32,np.ones_like(arr)),axis=-1);norm/=np.linalg.norm(norm,axis=-1)[...,None]
pix=np.ones((256,256,4),dtype=np.float32);pix[:,:,:3]=norm*.5+.5
img=bpy.data.images.new('Powder coat micro normal',256,256);img.colorspace_settings.name='Non-Color';img.pixels.foreach_set(pix.ravel());img.filepath_raw=os.path.join(OUT,'powder-normal.png');img.file_format='PNG';img.save()
for m in [body,edge]:
 nodes=m.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=img;uv=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=12
 m.node_tree.links.new(uv.outputs['UV'],mapping.inputs[0]);m.node_tree.links.new(mapping.outputs[0],tex.inputs['Vector'])
 normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.18;m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
# Apply modifiers once, preserve separately editable parts in the native .blend.
objects=[o for o in bpy.context.scene.objects if o.type in ('MESH','FONT','CURVE')]
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.convert(target='MESH')
# New cabinet primitives use box-projected UVs; imported assets keep their UVs.
new=[o for o in objects if not o.name.startswith(('Installed camera','Installed RX1'))]
bpy.ops.object.select_all(action='DESELECT')
for o in new:o.select_set(True)
bpy.context.view_layer.objects.active=new[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.cube_project(cube_size=.3);bpy.ops.object.mode_set(mode='OBJECT')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.world.color=(.16,.16,.16)
target=v((0,1.05,0))
for name,pos,power,size in [('Studio key',(-2.1,3,2.5),650,2),('Studio fill',(1.7,2.4,-2),800,1.7),('Soft rear fill',(-1.8,1.1,-2.5),350,1.5)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=v(pos);o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=2.5
cam.location=v((2.2,1.9,4.5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'photoism-kiosk.blend'))
# Merge by material AND parent, keeping rear doors independently switchable.
for parent in [shell,inside,doors]:
 for m in list(bpy.data.materials):
  items=[o for o in scene.objects if o.type=='MESH' and o.parent==parent and len(o.data.materials)==1 and o.data.materials[0]==m]
  if not items:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0]
  if len(items)>1:bpy.ops.object.join()
  items[0].name=parent.name+' '+m.name
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type=='MESH' or o in [shell,inside,doors]:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'photoism-kiosk.glb'),export_format='GLB',use_selection=True,export_apply=True)
if '--no-render' not in sys.argv:
 scene.render.filepath=os.path.join(OUT,'kiosk-front.png');bpy.ops.render.render(write_still=True)
 for o in doors.children:o.hide_render=True
 cam.location=v((-.5,1.6,-5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,'kiosk-inside.png');bpy.ops.render.render(write_still=True)
