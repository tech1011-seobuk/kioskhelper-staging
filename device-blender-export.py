import bpy, os, sys, json
source, destination = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=source)
groups = {
 'monitor': ('Monitor ',),
 'remote': ('Remote ',),
 'card': ('Card ', 'Door card rear housing'),
 'banknote': ('Banknote ', 'Note acceptor back module'),
 'light': ('Upper diffuser','Upper light rear casing','Upper light extrusion','Upper light mounting','Upper bracket bolts','Upper light retaining'),
 'led': ('Vertical light diffuser','LED '),
 'pc': ('Industrial PC','PC ', 'Serial ', 'USB dual','USB port','LAN socket','DC inlet'),
 'service': ('Bottom power panel','Service button','Breaker ','Control power marking'),
}
os.makedirs(destination, exist_ok=True)
result={}
for key,prefixes in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 chosen=[o for o in bpy.data.objects if o.type in ('MESH','FONT') and o.name.startswith(prefixes)]
 # A single light assembly is enough for equipment identification.
 if key=='led': chosen=[o for o in chosen if o.matrix_world.translation.x>0]
 for o in chosen:o.select_set(True)
 assert chosen,key
 bpy.ops.export_scene.gltf(filepath=os.path.join(destination,'device-'+key+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
 result[key]=[o.name for o in chosen]
with open(os.path.join(destination,'device-parts.json'),'w',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
