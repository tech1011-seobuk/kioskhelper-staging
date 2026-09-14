"""Blender --background --python camera-blender-build.py -- m50|850d|r10 OUTPUT_DIR
Editable .blend is saved before web mesh consolidation. Canon photos are references.
"""
import sys,os
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:];model=args[0];output=os.path.abspath(args[1]);os.makedirs(output,exist_ok=True)
base=Path(__file__).with_name('camera-blender-base.py').read_text(encoding='utf-8')
exec(compile(base.split('# Keep an editable native source')[0],str(Path(__file__).with_name('camera-blender-base.py')),'exec'))
OUT=output

def remove_prefix(*prefixes):
 for o in list(bpy.context.scene.objects):
  if any(o.name.startswith(p) for p in prefixes):bpy.data.objects.remove(o,do_unlink=True)

if model!='m50':
 # Separate shell outlines, housing profiles and grip sections for each model.
 is850=model=='850d';width=131 if is850 else 122;back=24 if is850 else 19
 remove_prefix('M50 Mark II main shell','Flash upper','Front Canon','Canon wordmark','Sculpted rubber','Grip shoulder','EOS badge','Top model label')
 if is850:
  outline=[(-61,2),(59,2),(64,6),(65,53),(63,64),(57,71),(35,76),(29,80),(25,93),(18,98),(-4,99),(-13,96),(-20,80),(-29,75),(-51,73),(-63,66),(-65,52),(-64,8)]
  hood=[(-25,72),(-21,86),(-13,96),(-6,99),(18,98),(26,92),(32,77),(30,73)]
  sections=[(4,-46,17,-11,12),(8,-48,17,-15,15),(24,-49,17,-21,20),(46,-50,17,-23,22),(62,-48,18,-22,22),(69,-46,17,-16,18),(72,-45,14,-12,14)]
 else:
  outline=[(-57,2),(-31,3),(51,4),(59,7),(61,14),(61,54),(58,65),(50,69),(34,71),(27,77),(24,85),(19,88),(-6,88),(-14,84),(-18,74),(-23,71),(-41,71),(-54,67),(-61,57),(-61,10)]
  hood=[(-20,71),(-15,83),(-8,87),(20,87),(26,82),(32,72),(29,69)]
  sections=[(4,-44,17,-13,13),(8,-45,18,-17,17),(25,-48,16,-24,22),(45,-48,17,-25,24),(60,-45,19,-24,23),(67,-41,19,-20,21),(70,-39,17,-16,18)]
 shell=profile(model+' independent body shell',outline,-15,back,bodymat,2.6 if is850 else 2)
 cut=cyl('Temporary cutter',(9,-15,36 if is850 else 37),29.8,17,black)
 bpy.context.view_layer.objects.active=shell;mod=shell.modifiers.new('Lens recess','BOOLEAN');mod.object=cut;mod.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
 profile(model+' flash housing',hood,-19,back-2,bodymat,3 if is850 else 1.8)
 text('Canon wordmark','Canon',(5,-20.5,87 if is850 else 80),7 if is850 else 6.5,serif=True)
 verts=[];faces=[];N=64
 for z,x,rx,y,ry in sections:
  for i in range(N):a=2*pi*i/N;verts.append(((x+rx*cos(a))*U,(y+ry*sin(a))*U,z*U))
 for k in range(len(sections)-1):
  for i in range(N):faces.append((k*N+i,k*N+(i+1)%N,(k+1)*N+(i+1)%N,(k+1)*N+i))
 faces.extend([tuple(range(N-1,-1,-1)),tuple(range((len(sections)-1)*N,len(sections)*N))])
 mesh=bpy.data.meshes.new(model+' ergonomic grip');mesh.from_pydata(verts,[],faces);mesh.update();grip=bpy.data.objects.new(model+' ergonomic grip',mesh);bpy.context.collection.objects.link(grip);finish(grip,grip.name,rubber);sub=grip.modifiers.new('Grip smoothing','SUBSURF');sub.levels=2
 for modifier in list(grip.modifiers):
  if modifier.type=='WEIGHTED_NORMAL':grip.modifiers.remove(modifier)
 box(model+' shoulder',(-45,-15,70 if is850 else 68),(31,35,6),bodymat,2.7)
 # Larger EF/RF mounts retain a full recessed bore and contact array.
 mount_prefix=('Mount outer','Stainless','Recess black','Dark sensor','Sensor frame','APS-C','Fine concentric','Mount screw','Screw slot','Gold contact','Mount alignment')
 for o in list(bpy.context.scene.objects):
  if any(o.name.startswith(p) for p in mount_prefix):
   if o.type=='MESH':
    # Rings are constructed in world-relative mesh coordinates.
    for v in o.data.vertices:
     world=o.matrix_world@v.co;world.x=(world.x-.09)*1.12+.09;world.z=(world.z-.34)*1.12+(.36 if is850 else .37);v.co=o.matrix_world.inverted()@world
 for name in ['Lens release','AF assist housing','AF assist lens']:
  o=bpy.data.objects.get(name)
  if o:o.location.x+=.07;o.location.z+=.05
 for name in ['AF assist housing','AF assist lens']:
  o=bpy.data.objects.get(name)
  if o:o.location.x=-.24;o.location.z=.65
 # Rear assembly is located at the actual deeper back surface.
 for o in list(bpy.context.scene.objects):
  if o.name.startswith(('Rear','Selector','Q SET','Playback','Articulated','Display','Eyecup','Viewfinder')):o.location.y+=(back-15)*U
  if o.name.startswith(('Hotshoe',)):o.location.z+=(13 if is850 else 3)*U;o.location.y+=.04
  if o.name.startswith(('Side strap',)):o.location.x*=width/116;o.location.z+=.07
  if o.name.startswith(('Bottom seam',)):o.scale.x=width/116;o.scale.y=(back+15)/30
 remove_prefix('Shutter','Mode dial','Mode ','Record','M Fn','M-Fn')
 cyl('Shutter',( -47,-29,74 if is850 else 72),4.6,1.8,darkmetal,'Z')
 wheel=cyl('Forward control wheel',(-47,-15,69 if is850 else 67),5,3,darkmetal,'X')
 for i in range(40):
  a=2*pi*i/40;box('Wheel texture',(-47,-15+5*cos(a),(69 if is850 else 67)+5*sin(a)),(3,.3,.3),darkmetal,.08)
 dialz=74 if is850 else 72
 knurled('Mode dial',-38 if is850 else -29,12,dialz,8.8,3)
 for i,label in enumerate(['M','Av','Tv','P','A+','SCN']):
  a=i*pi/3;text('Mode '+label,label,((-38 if is850 else -29)+6*cos(a),12+6*sin(a),dialz+1.6),1.6,blue if label=='A+' else white,'top')
 if is850:
  for x,txt in [(-32,'AF'),(-43,'ISO'),(-55,'DISP')]:cyl('Top '+txt,(x,0,74),2,1,black,'Z');text('Top label '+txt,txt,(x,-3.8,74),1.4,white,'top')
  remove_prefix('APS-C sensor')
  mirror=mat('DSLR reflex mirror',(.32,.35,.36),.12,.9)
  box('Mirror frame',(9,-9.7,36),(27,1.1,21),black,.4);box('DSLR mirror',(9,-10.4,36),(23,.4,16),mirror,.3)
  box('850D front badge',(54,-16,61),(16,1,14),bodymat,1.5);text('850D badge','EOS\n850D',(54,-16.7,61),3.2)
 else:
  knurled('Rear thumb dial',-51,12,72,7.5,3)
  cyl('Record',(-35,-1,72),2.8,1,black,'Z');cyl('Record red',(-35,-1,72.6),1,.2,red,'Z')
  cyl('Lock',(-48,-1,72),2.5,1,black,'Z');text('Lock label','LOCK',(-48,3,72.1),1.3,white,'top')
  cyl('Front AF MF switch',(-24,-24,13),5.7,2,black);cyl('AF button',(-24,-25.2,13),3.4,1,darkmetal);text('AF MF label','AF MF',(-24,-25.7,20),2)
  box('R10 badge',(53,-16,61),(15,1,9),bodymat,1.4);text('R10 badge text','R10',(53,-16.7,61),4)
  cyl('Rear joystick',(-35,back+6,51),2.8,2,rubber)
 # A taller eyecup and display silhouette on the DSLR.
 if is850:
  for o in list(bpy.context.scene.objects):
   if o.name.startswith(('Eyecup','Viewfinder')):o.location.z+=.12

# Avoid flat weighted normals on organic grip surfaces.
for o in bpy.context.scene.objects:
 if 'grip' in o.name.lower():
  for modifier in list(o.modifiers):
   if modifier.type=='WEIGHTED_NORMAL':o.modifiers.remove(modifier)
if model!='m50':
 remove_prefix('Bottom seam')
 box('Bottom seam',(0,(back-15)/2,3),(width-6,back+12,2),black,.6)

# Export a small repeatable normal map: unlike Blender noise nodes, this also works in glTF.
import numpy as np
rng=np.random.default_rng(50);N=256
height=rng.random((N,N)).astype('float32')
for _ in range(3):height=(height+np.roll(height,1,0)+np.roll(height,-1,0)+np.roll(height,1,1)+np.roll(height,-1,1))/5
gx=(np.roll(height,1,1)-np.roll(height,-1,1))*2;gy=(np.roll(height,1,0)-np.roll(height,-1,0))*2
arr=np.stack((gx,gy,np.ones_like(gx)),axis=-1);arr/=np.linalg.norm(arr,axis=-1,keepdims=True);rgba=np.ones((N,N,4),dtype='float32');rgba[:,:,:3]=arr*.5+.5
img=bpy.data.images.new('Fine grip normal',width=N,height=N);img.colorspace_settings.name='Non-Color';img.pixels.foreach_set(rgba.ravel());img.filepath_raw=os.path.join(OUT,'grip-normal.png');img.file_format='PNG';img.save();img.pack()
for m in [bodymat,rubber]:
 nodes=m.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=img;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.04 if m==bodymat else .12;m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
# Use non-overlapping face projections, then consolidate by material for mobile draw calls.
objects=list(bpy.context.scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.convert(target='MESH')
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.01);bpy.ops.object.mode_set(mode='OBJECT')

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
def area(name,loc,power,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size*U;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=Vector(loc)*U;o.rotation_euler=(Vector((0,0,42))*U-o.location).to_track_quat('-Z','Y').to_euler()
area('Studio left',(-100,-110,160),150,110);area('Studio right',(100,-30,90),100,65);area('Rim',(25,80,150),210,90)
floor=box('Studio floor',(0,0,-3),(10000,10000,3),mat('Studio graphite',(.045,.049,.055),.48),.1)
d=bpy.data.cameras.new('Product camera');cam=bpy.data.objects.new('Product camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.lens=62
target=Vector((0,0,46))*U;cam.location=Vector((-130,-250,125))*U;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
for s in bpy.data.screens:
 for a in s.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,model+'.blend'))
for material in list(bpy.data.materials):
 group=[o for o in scene.objects if o.type=='MESH' and o!=floor and o.data.materials and o.data.materials[0]==material]
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0]
 if len(group)>1:bpy.ops.object.join()
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type=='MESH' and o!=floor:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'camera-'+model+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
if '--no-render' not in sys.argv:
 scene.render.filepath=os.path.join(OUT,model+'-front.png');bpy.ops.render.render(write_still=True)
 cam.location=Vector((120,250,120))*U;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,model+'-back.png');bpy.ops.render.render(write_still=True)
