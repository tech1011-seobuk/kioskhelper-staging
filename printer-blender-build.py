"""Original selection models. Blender --background --python printer-blender-build.py -- rx1 OUTPUT
References and limitations: PRINTER_REFERENCES.md. Units below are millimetres.
"""
import bpy, sys, os, math
from mathutils import Vector
from math import pi
model, OUT = sys.argv[sys.argv.index('--')+1:][:2]
OUT=os.path.abspath(OUT)
assert model in ('rx1','ask400')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
U=.01
def mat(name,c,rough=.4,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
shell=mat('Warm light grey enclosure',(.66,.68,.67),.38,.08)
front=mat('Moulded front cover',(.58,.60,.59),.36)
silver=mat('Satin metal rear',(.31,.34,.35),.45,.55)
black=mat('Dark recesses',(.009,.012,.014),.63)
plastic=mat('Black scrap box',(.025,.03,.031),.4)
ink=mat('Dark printed lettering',(.06,.07,.075),.6)
white=mat('Light printed lettering',(.85,.88,.87),.5)
blue=mat('DNP blue',(.016,.085,.40),.4)
green=mat('Green status lens',(.26,.62,.02),.3)
def box(name,loc,size,m=shell,r=1):
 bpy.ops.mesh.primitive_cube_add(size=1,location=Vector(loc)*U);o=bpy.context.object;o.name=name;o.dimensions=Vector(size)*U;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if r:
  b=o.modifiers.new('Edge radius','BEVEL');b.width=r*U;b.segments=3
 n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
 return o
def cyl(name,loc,r,d,m=black,axis='Y',N=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=N,radius=r*U,depth=d*U,location=Vector(loc)*U);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 if axis=='Y':o.rotation_euler.x=pi/2
 elif axis=='X':o.rotation_euler.y=pi/2
 return o
def text(name,txt,loc,size,m=ink,face='front'):
 c=bpy.data.curves.new(name,'FONT');c.body=txt;c.size=size*U;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=4
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=Vector(loc)*U;o.rotation_euler=(pi/2,0,0 if face=='front' else pi);c.materials.append(m)
 return o
def screw(x,y,z,axis='Y'):
 cyl('Recessed screw',(x,y,z),2.2,.7,silver,axis)
 if axis=='Y':box('Screw head slot',(x,y+(.45 if y>0 else -.45),z),(2.7,.12,.5),black,.1)
def vents(side,x,y,z,cols,rows,step=5):
 verts=[];faces=[]
 for col in range(cols):
  for row in range(rows):
   a=x+col*step if side=='back' else y+col*step;b=z+row*step;n=len(verts)
   for da,db in [(-1.1,-1.65),(1.1,-1.65),(1.1,1.65),(-1.1,1.65)]:
    verts.append(((a+da)*U,y*U,(b+db)*U) if side=='back' else (x*U,(a+da)*U,(b+db)*U))
   faces.append((n,n+1,n+2,n+3))
 mesh=bpy.data.meshes.new('Ventilation perforations');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Ventilation perforations',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black)
def ports(y,z,x=60):
 box('AC socket bezel',(x,y,z),(29,2,22),plastic,2)
 box('AC socket cavity',(x,y+1.2,z),(22,.8,15),black,1)
 for dx,dz in [(-6,0),(6,0),(0,5)]:box('AC contact',(x+dx,y+1.8,z+dz),(1.5,.8,4),silver,.2)
 box('USB B metal socket',(x-38,y,z+1),(12,2,12),silver,1)
 box('USB B opening',(x-38,y+1.2,z+1),(8,.6,8),black,.8)
 text('AC label','AC IN',(x,y+2,z+18),4,ink,'back');text('USB label','USB',(x-38,y+2,z+18),4,ink,'back')

if model=='rx1':
 W,D,H=322,351,281
 box('RX1 enclosure',(0,8,145),(322,330,262),shell,5)
 box('RX1 lower plinth',(0,0,26),(318,346,36),front,3)
 box('RX1 front shadow joint',(0,-166,151),(316,6,252),plastic,7)
 # Separate strips form a real opening rather than a black decal on a solid front.
 box('RX1 upper fascia',(0,-172,233),(322,12,86),front,8)
 for x in [-131,131]:box('RX1 rounded front pillar',(x,-172,130),(60,12,144),front,7)
 box('RX1 output upper lip',(0,-176,180),(205,5,10),front,2)
 box('RX1 output throat',(0,-177,189),(188,2,9),black,1)
 box('RX1 cutter edge',(0,-178.3,189),(180,.7,1.7),silver,.3)
 box('RX1 scrap bin',(0,-179,87),(199,8,166),plastic,2)
 box('RX1 bin rim',(0,-184,164),(198,4,6),black,1)
 box('RX1 bin lower grip',(0,-185,24),(80,5,9),black,2)
 text('Pull label','PULL',(0,-188,29),4,white)
 box('DNP badge',(0,-179,241),(43,1.8,13),silver,1)
 text('DNP wordmark','DNP',(0,-180.1,241),9,blue)
 box('RX1 model badge',(111,-179,253),(39,1,9),white,.8)
 text('RX1 model text','DS-RX1',(111,-179.7,253),5,blue)
 for i,label in enumerate(['POWER','RIBBON','PAPER','ERROR']):
  z=261-i*13;box('RX1 indicator',(-150,-179,z),(4,1.5,2.3),green if i==0 else plastic,1);text('RX1 '+label,label,(-131,-179.8,z),3.2)
 box('RX1 top opening lever recess',(0,-157,276),(100,16,2),black,3)
 box('RX1 opening lever',(0,-160,278),(88,9,3),silver,2)
 for x in [-127,127]:box('RX1 top lid seam',(x,0,276.3),(.65,310,.4),ink,.1)
 vents('side',161.2,83,214,11,6)
 box('RX1 rear metal plate',(0,174,143),(307,3,258),silver,1)
 vents('back',-130,176,137,22,21)
 ports(177,52,88)
 box('RX1 power switch',(88,178,91),(15,2,23),black,2);text('RX1 switch mark','I  O',(88,179.2,91),4,white,'back')
 for x in [-148,148]:
  for z in [22,266]:screw(x,176,z)
 box('RX1 rear ID sticker',(67,176.2,190),(77,.4,58),white,.3)
 text('RX1 rear label','DNP\nDS-RX1',(67,176.8,196),7,ink,'back')
 for z in [170,176,182]:box('RX1 label rule',(67,177,z),(64,.1,.5),ink,0)
else:
 W,D,H=275,366,170
 box('ASK400 metal chassis',(0,5,86),(275,354,162),shell,2)
 box('ASK400 bottom seam',(0,0,5),(272,362,6),plastic,1)
 box('ASK400 front upper fascia',(0,-177,140),(275,13,52),front,7)
 box('ASK400 front lower frame',(0,-177,52),(275,13,104),front,5)
 box('ASK400 upper seam',(0,-184,111),(271,.6,1.7),black,.4)
 # Output slot and front black removable scrap box are the distinctive ASK400 features.
 box('ASK400 output recess',(0,-184.1,136),(219,1,13),silver,3)
 box('ASK400 paper output',(0,-185,138),(204,1,6),black,1)
 box('ASK400 cutter rail',(0,-185.7,139),(201,.3,1),silver,.15)
 box('ASK400 scrap box gasket',(0,-185,69),(212,3,84),black,2)
 box('ASK400 scrap box',(0,-188,69),(207,5,79),plastic,2)
 box('ASK400 opening lever recess',(0,-184.2,15),(111,1,12),black,2)
 box('ASK400 opening lever',(0,-187,15),(97,4,4),silver,1)
 box('ASK400 standby switch recess',(121,-184.5,16),(17,2,11),black,2)
 box('ASK400 standby rocker',(121,-186,16),(7,2,9),plastic,1)
 text('Fujifilm wordmark','FUJIFILM',(-82,-184.5,152),7,white)
 text('ASK400 model','ASK-400',(97,-184.5,153),5,white)
 for i,label in enumerate(['ON/STANDBY','RIBBON','PAPER','ERROR']):
  z=72-i*12;text('ASK400 '+label,label,(-121,-184.6,z+4),2.6,white);box('ASK400 status LED',(-121,-185,z),(8,1,2),green if i==0 else black,1)
 vents('side',-137.8,109,35,5,22,5)
 vents('side',-137.8,36,86,13,10,4)
 vents('side',137.8,95,76,12,15,4)
 box('ASK400 rear plate',(0,182,85),(271,2,160),silver,1)
 vents('back',-119,183.5,30,26,24,4)
 ports(184,32,101)
 box('ASK400 rear ID sticker',(85,183.4,114),(68,.4,47),white,.3)
 text('ASK400 rear label','FUJIFILM\nASK-400',(85,184,119),6,ink,'back')
 for x in [-128,128]:
  for z in [15,156]:screw(x,184,z)
 for x in [-137.8,137.8]:
  for y in [-138,140]:screw(x,y,23,'X')
for x in [-W/2+25,W/2-25]:
 for y in [-D/2+27,D/2-27]:cyl('Rubber foot',(x,y,0),9,6,black,'Z')

# Editable source keeps named parts. Web export merges meshes per material.
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.convert(target='MESH')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=900;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.world.color=(.25,.25,.25)
target=Vector((0,0,H*.48))*U
for name,loc,power,size in [('Key',(-450,-500,700),1500,500),('Fill',(500,-100,400),900,400),('Rim',(50,500,650),1300,400)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size*U;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=Vector(loc)*U;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Product camera');cam=bpy.data.objects.new('Product camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=5.8
cam.location=Vector((-500,-800,500))*U;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.film_transparent=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,model+'.blend'))
for m in list(bpy.data.materials):
 group=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0]
 if len(group)>1:bpy.ops.object.join()
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'printer-'+model+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
if '--no-render' not in sys.argv:
 scene.render.filepath=os.path.join(OUT,model+'-front.png');bpy.ops.render.render(write_still=True)
 cam.location=Vector((500,800,450))*U;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,model+'-back.png');bpy.ops.render.render(write_still=True)
