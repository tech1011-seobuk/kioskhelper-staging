"""Reconstruct photo-visible decals as crisp geometry; no invented instruction text.
Run after build-door.py. Source photo: codex-clipboard-208ff3b8...png.
"""
import bpy, os, ast, math
from mathutils import Vector
from math import pi
OUT=os.path.abspath('outputs/blender-kiosk-door')
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'photoism-kiosk-door.blend'))
scene=bpy.context.scene
shell=bpy.data.objects['Kiosk shell'];inside=bpy.data.objects['Kiosk internal equipment'];doors=bpy.data.objects['kiosk_rear_doors'];door=bpy.data.objects['kiosk_front_door'];studio=bpy.data.objects['Studio only']
white=bpy.data.materials['Printed white labels'];black=bpy.data.materials['Black plastic housings'];body=bpy.data.materials['Black powder coated steel'];edge=bpy.data.materials['Folded black steel edges']
tree=ast.parse(open('outputs/blender-kiosk-v3/build-v3.py',encoding='utf8').read())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['v','finish','box','label']],type_ignores=[]),'<helpers>','exec'))
for o in list(scene.objects):
 if o.name.startswith(('How to use','Instruction','Camera marker','LOOK HERE')):bpy.data.objects.remove(o,do_unlink=True)
# Satin vinyl, not raised metallic lettering.
ink=white.copy();ink.name='Warm white vinyl print';ink.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.43
matte=black.copy();matte.name='Matte black magnetic label';matte.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.68
box('LOOK HERE vinyl backing',(0,1.641,.058),(.182,.036,.0007),matte,.0006)
mark=label('Camera marker','LOOK HERE!',(0,1.641,.0586),.171,.025,ink)
font='C:/Windows/Fonts/arialbd.ttf'
if os.path.exists(font):mark.data.font=bpy.data.fonts.load(font)
# White hand below lens, slanted toward it. Thin black border follows the outline.
pts=[(-.26,-.40),(-.38,-.21),(-.43,-.02),(-.40,.09),(-.32,.13),(-.22,.05),(-.18,-.04),(-.18,.65),(-.15,.72),(-.09,.75),(-.02,.73),(.02,.66),(.02,.13),(.09,.17),(.17,.14),(.20,.07),(.27,.10),(.35,.05),(.36,-.02),(.43,-.03),(.47,-.12),(.43,-.30),(.31,-.44),(.29,-.51),(-.20,-.51)]
def hand(name,scale,z,m):
 a=-.32;verts=[]
 for x,y in pts:
  xx=(x*math.cos(a)-y*math.sin(a))*scale;yy=(x*math.sin(a)+y*math.cos(a))*scale
  verts.append(v((-.040+xx,1.455+yy,z)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[tuple(range(len(verts)))]);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.parent=shell;mesh.materials.append(m)
hand('Hand sticker black die-cut outline',.065,.0585,matte)
hand('Hand sticker white print',.057,.059,ink)
# Match the seven framed steps and double border seen in the supplied front photo.
# Fine instruction wording is not legible in the reference, so leave it untranscribed.
def line(name,a,b,z,parent=door,width=.0008,m=ink):
 x,y=a;xx,yy=b
 o=box(name,((x+xx)/2,(y+yy)/2,z),(math.hypot(xx-x,yy-y),width,.0002),m,0,parent)
 o.rotation_euler.y=-math.atan2(yy-y,xx-x)
 return o
def frame(name,x,y,w,h,z,parent=door):
 for a,b in [((x-w/2,y-h/2),(x+w/2,y-h/2)),((x+w/2,y-h/2),(x+w/2,y+h/2)),((x+w/2,y+h/2),(x-w/2,y+h/2)),((x-w/2,y+h/2),(x-w/2,y-h/2))]:line(name,a,b,z,parent)
box('How to use magnetic sheet',(0,1.01,.2585),(.745,.104,.0012),matte,.0006,door)
frame('How to use outer white border',0,1.01,.734,.094,.2593)
frame('How to use inner white border',0,1.01,.722,.082,.2594)
title=label('How to use heading','HOW TO USE',(-.277,1.044,.2598),.155,.012,ink,door)
if os.path.exists(font):title.data.font=bpy.data.fonts.load(font)
for i in range(7):
 x=-.309+i*.103
 frame('Instruction step frame',x,1.001,.087,.049,.2598)
 label('Instruction step number',str(i+1),(x,1.026,.2601),.009,.010,ink,door)
 # Minimal equipment pictograms, distinguishable instead of arbitrary text bars.
 frame('Instruction pictogram',x,1.005,.021,.013,.2601)
 line('Instruction pictogram base',(x-.013,.996),(x+.013,.996),.2601)
 if i<6:
  line('Instruction next arrow',(x+.046,1.001),(x+.055,1.001),.2601)
  line('Instruction next arrow',(x+.052,1.004),(x+.055,1.001),.2601)
  line('Instruction next arrow',(x+.052,.998),(x+.055,1.001),.2601)
bpy.context.view_layer.update()
for o in scene.objects:
 if o.parent==door and o.name.startswith(('How to use','Instruction')):
  o.matrix_parent_inverse=door.matrix_world.inverted()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'photoism-kiosk-pointing.blend'))
for o in list(scene.objects):
 if o.type=='FONT':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
for parent in [shell,inside,doors,door]:
 for m in list(bpy.data.materials):
  items=[o for o in scene.objects if o.type=='MESH' and o.parent==parent and len(o.data.materials)==1 and o.data.materials[0]==m]
  if not items:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0]
  if len(items)>1:bpy.ops.object.join()
  items[0].name=parent.name+' '+m.name
for m in [body,edge]:
 normal=next(n for n in m.node_tree.nodes if n.type=='NORMAL_MAP');m.node_tree.links.new(normal.outputs['Normal'],m.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if (o.type=='MESH' and o.parent!=studio) or o in [shell,inside,doors,door]:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'photoism-kiosk-pointing.glb'),export_format='GLB',use_selection=True,export_apply=True)
scene.cycles.samples=12;scene.render.resolution_x=1000;scene.render.resolution_y=1000
cam=scene.camera;cam.data.ortho_scale=.93;target=v((0,1.45,.06));cam.location=v((.15,1.50,4));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(OUT,'pointing-detail.png');bpy.ops.render.render(write_still=True)
