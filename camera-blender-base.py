import bpy, math, os
from mathutils import Vector
from math import sin, cos, pi

OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
U=.01
def mat(name,color,rough=.4,metal=0,grain=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Specular IOR Level'].default_value=.22 if not metal else .5
 if grain:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=grain;tex.inputs['Detail'].default_value=3;tex.inputs['Roughness'].default_value=.75
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.65;bump.inputs['Distance'].default_value=.002 if grain<400 else .00045
  m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
bodymat=mat('Fine textured black polycarbonate',(.004,.005,.006),.52,0,550)
rubber=mat('Pebbled grip rubber',(.003,.004,.005),.82,0,95)
black=mat('Inner matte black',(.003,.004,.005),.7)
metal=mat('Machined satin aluminium',(.48,.51,.54),.24,.85)
darkmetal=mat('Black anodised controls',(.006,.007,.008),.4,.35)
gold=mat('Gold electrical contacts',(.60,.39,.08),.2,.85)
white=mat('Warm white lettering',(.8,.81,.8),.45)
red=mat('Record red',(.65,.012,.018),.32)
blue=mat('Playback blue',(.06,.35,.68),.35)
glass=mat('Sensor optical coating',(.006,.08,.075),.13,.55)
screen=mat('Screen black glass',(.013,.017,.022),.18,.25)
def finish(o,name,m,bevel=0):
 o.name=name;o.data.materials.append(m)
 if bevel:
  b=o.modifiers.new('Manufactured edge radii','BEVEL');b.width=bevel*U;b.segments=4
 for p in getattr(o.data,'polygons',[]):p.use_smooth=True
 if o.type=='MESH':
  n=o.modifiers.new('Surface normals','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=40
 return o
def box(name,loc,size,m=bodymat,r=1):
 bpy.ops.mesh.primitive_cube_add(size=1,location=Vector(loc)*U);o=bpy.context.object;o.dimensions=Vector(size)*U;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,r)
def cyl(name,loc,r,d,m=black,axis='Y',vertices=96):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r*U,depth=d*U,location=Vector(loc)*U);o=bpy.context.object
 if axis=='Y':o.rotation_euler.x=pi/2
 elif axis=='X':o.rotation_euler.y=pi/2
 return finish(o,name,m,.15)
def ring(name,loc,outer,inner,depth,m=metal):
 verts=[];faces=[];N=128
 for y,r in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)]:
  for i in range(N):
   a=2*pi*i/N;verts.append(((loc[0]+r*cos(a))*U,(loc[1]+y)*U,(loc[2]+r*sin(a))*U))
 for a,b in [(0,1),(2,0),(1,3),(3,2)]:
  for i in range(N):j=(i+1)%N;faces.append((a*N+i,a*N+j,b*N+j,b*N+i))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,m,.12)
font=None
fontpath='C:/Windows/Fonts/georgiab.ttf'
if os.path.isfile(fontpath):font=bpy.data.fonts.load(fontpath)
def text(name,txt,loc,size,m=white,face='front',serif=False):
 c=bpy.data.curves.new(name,'FONT');c.body=txt;c.size=size*U;c.align_x='CENTER';c.align_y='CENTER';c.extrude=.004*U;c.resolution_u=8
 if serif and font:c.font=font
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=Vector(loc)*U
 if face=='front':o.rotation_euler=(pi/2,0,0)
 elif face=='back':o.rotation_euler=(pi/2,0,pi)
 c.materials.append(m);return o
def profile(name,points,front,back,m,r=1):
 verts=[(x*U,y*U,z*U) for y in [front,back] for x,z in points];N=len(points)
 faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,m,r)

# Body proportions traced from Canon front/back/top product photographs.
outline=[(-56,2),(56,2),(58,5),(58,59),(56,63),(33,64),(28,66),(24,80),(21,84),(-7,84),(-12,81),(-17,65),(-22,64),(-53,64),(-58,60),(-58,6)]
body=profile('M50 Mark II main shell',outline,-15,15,bodymat,1.5)
# Recess into the real shell; lens mount is not a disc pasted onto a box.
cut=cyl('Temporary aperture cutter',(9,-15,34),26.4,16,black)
bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Recessed lens cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
box('Bottom seam', (0,0,3),(113,31,2),black,.6)
# Closed flash cover with tapered outline and rounded transitions.
profile('Flash upper housing',[(-17,64),(-13,75),(-10,82),(-7,85),(22,85),(26,82),(30,66),(27,64)],-17,13,bodymat,1.8)
profile('Front Canon badge panel',[(-10,68),(-8,78),(20,78),(24,68)],-18.4,-17.4,bodymat,1)
text('Canon wordmark','Canon',(7,-19.1,73),6.4,serif=True)

# Ergonomic rubber handgrip built as a smooth varying cross section.
verts=[];faces=[];N=64
sections=[(4,-43,13,-11,7),(6,-44,14,-13,8),(17,-45,13,-15,10),(34,-46,12,-17,11),(48,-44,14,-16,11),(57,-43,15,-12,9),(60,-42,14,-10,7)]
for z,x,rx,y,ry in sections:
 for i in range(N):
  a=2*pi*i/N;verts.append(((x+rx*cos(a))*U,(y+ry*sin(a))*U,z*U))
for k in range(len(sections)-1):
 for i in range(N):faces.append((k*N+i,k*N+(i+1)%N,(k+1)*N+(i+1)%N,(k+1)*N+i))
faces.extend([tuple(range(N-1,-1,-1)),tuple(range((len(sections)-1)*N,len(sections)*N))])
mesh=bpy.data.meshes.new('Grip surface');mesh.from_pydata(verts,[],faces);mesh.update();grip=bpy.data.objects.new('Sculpted rubber handgrip',mesh);bpy.context.collection.objects.link(grip);finish(grip,grip.name,rubber)
sub=grip.modifiers.new('Grip surface smoothing','SUBSURF');sub.levels=2
box('Grip shoulder',(-43,-9,61),(27,23,3),bodymat,1.4)

mx,mz=9,34
ring('Mount outer black gasket',(mx,-17,mz),30.7,27,1.5,black)
ring('Stainless EF-M mount',(mx,-18.2,mz),29.6,24.5,2.1,metal)
ring('Recess black bore',(mx,-14,mz),25.4,22,8,black)
cyl('Dark sensor chamber',(mx,-8,mz),24,1,black)
box('Sensor frame',(mx,-9.2,mz),(25,.7,18),darkmetal,.25)
box('APS-C sensor',(mx,-9.7,mz),(22.3,.35,14.9),glass,.1)
for rr in [25.0,25.3,25.6,25.9,26.2,26.5,26.8]:ring('Fine concentric inner machining',(mx,-19.35,mz),rr+.035,rr,.04,darkmetal)
for a in [40,140,220,320]:
 a=math.radians(a);x=mx+27.6*cos(a);z=mz+27.6*sin(a)
 cyl('Mount screw',(x,-19.45,z),.95,.25,darkmetal)
 box('Screw slot',(x,-19.62,z),(1.05,.04,.18),black,.025)
for i in range(9):
 a=math.radians(243+i*6);cyl('Gold contact',(mx+21*cos(a),-15,mz+21*sin(a)),.47,.6,gold)
cyl('Mount alignment mark',(0,-19.5,60),.9,.1,white)
cyl('Lens release',(47,-17.1,33),3.5,3,darkmetal)
cyl('AF assist housing',(48,-16.1,56),2.4,1.5,black)
cyl('AF assist lens',(48,-17,56),1.65,.2,glass)
text('EOS badge','EOS',(45,-16.6,11),5)

# Top plate: shutter/control ring, mode dial, record/M-Fn, hot shoe.
def knurled(name,x,y,z,r,d):
 cyl(name,(x,y,z),r,d,darkmetal,'Z')
 for i in range(64):
  a=2*pi*i/64;o=box(name+' knurl',(x+(r-.12)*cos(a),y+(r-.12)*sin(a),z),(.32,.48,d-.25),darkmetal,.08);o.rotation_euler.z=a
knurled('Shutter control dial',-42,-13,65,7.1,3.3)
cyl('Shutter polished button',(-42,-13,67),4.8,1.2,darkmetal,'Z')
knurled('Mode dial',-42,7,66,8.5,3.5)
for i,label in enumerate(['M','Av','Tv','P','A+','SCN']):
 a=i*pi/3;text('Mode '+label,label,(-42+5.8*cos(a),7+5.8*sin(a),67.85),1.5,blue if label=='A+' else white,'top')
cyl('Record button',(-54,-8,65),2.5,1,black,'Z');cyl('Record red dot',(-54,-8,65.6),.85,.1,red,'Z')
cyl('M Fn',(-29,2,65),2.8,1,black,'Z');text('M Fn text','M-Fn',(-29,2,65.6),1.2,white,'top')
box('Hotshoe base',(7,4,85),(18,18,1),black,.6)
for x in [-1,15]:box('Hotshoe metal rail',(x,4,86),(2,17,1.5),metal,.25)
box('Hotshoe plate',(7,4,85.7),(11,16,.35),metal,.2)
for x,y in [(7,4),(4,8),(10,8),(4,11),(10,11)]:cyl('Hotshoe contact',(x,y,86),.8,.2,darkmetal,'Z')
text('Top model label','EOS M50 Mark II',(39,7,64.7),1.7,white,'top')

# Rear articulated display, eyecup and the actual control cluster.
box('Rear screen hinge', (54,17,31),(4,5,48),bodymat,1)
box('Articulated monitor casing',(10,17,32),(85,4,54),bodymat,1.8)
box('Display rubber seal',(10,19.2,32),(82,1,51),black,1.2)
box('Display glass',(10,19.9,32),(78,.45,47),screen,.7)
box('Rear thumb grip',(-47,16.5,42),(17,4,39),rubber,3)
box('Eyecup outer rubber',(7,18,74),(32,10,18),rubber,3.5)
box('Eyecup recess',(7,23.2,74),(23,.8,12),black,2)
box('Viewfinder lens',(7,23.8,74),(12,.3,9),glass,1.4)
for z,txt in [(56,'*'),(47,'[]'),(34,'INFO'),(10,'MENU')]:
 cyl('Rear '+txt,(-50,20,z),3,1.5,darkmetal);text('Rear label '+txt,txt,(-50,20.85,z),1.5,white,'back')
cyl('Rear selector',(-46,20,22),7,1.6,darkmetal)
cyl('Q SET button',(-46,21,22),3.5,1,black);text('Q SET','Q\nSET',(-46,21.6,22),1.6,white,'back')
for x,z,txt in [(-46,27,'+'),(-46,17,'-'),(-51,22,'AF'),(-41,22,'F')]:text('Selector '+txt,txt,(x,21.2,z),1.3,white,'back')
cyl('Playback',(-38,20,10),2.8,1.2,darkmetal);text('Playback symbol','>',(-38,20.7,10),2.3,blue,'back')
for x in [-58.5,58.5]:
 box('Side strap anchor',(x,0,58),(3,7,2),metal,.7)
box('Port cover',(58.4,2,40),(1.4,17,24),rubber,.7)
box('Battery cover',(-35,1,1),(34,23,1),bodymat,.8)
cyl('Tripod socket',(6,0,1),3,1,metal,'Z')

# Keep an editable native source and a geometry/material web export.
model_objects=list(bpy.context.scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in model_objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'m50-mark-ii.glb'),export_format='GLB',use_selection=True)

floor=box('Studio floor',(0,0,-3),(10000,10000,3),mat('Studio graphite',(.045,.049,.055),.48),.1)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world.color=(.18,.18,.18)
scene.view_settings.view_transform='AgX'
def area(name,loc,power,size,target=(0,0,35),color=(1,1,1)):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size*U;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=Vector(loc)*U;o.rotation_euler=(Vector(target)*U-o.location).to_track_quat('-Z','Y').to_euler()
area('Large softbox left',(-100,-110,160),150,110)
area('Right strip',(100,-30,90),100,65,color=(.83,.9,1))
area('Rim softbox',(25,80,150),210,90)
d=bpy.data.cameras.new('Product camera');cam=bpy.data.objects.new('Product camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.lens=62
def view(loc,path):
 cam.location=Vector(loc)*U;cam.rotation_euler=(Vector((0,0,42))*U-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,path);bpy.ops.render.render(write_still=True)
cam.location=Vector((-115,-220,115))*U;cam.rotation_euler=(Vector((0,0,42))*U-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'m50-mark-ii.blend'))
view((-115,-220,115),'m50-front.png')
view((110,220,110),'m50-back.png')
