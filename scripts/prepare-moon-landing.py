import bpy, os, bmesh
from pathlib import Path
root=Path.cwd()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path.home()/'Downloads/moon_landing.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Bake source hierarchy before simplifying; preserve astronaut/flag silhouettes.
for o in meshes:
 world=o.matrix_world.copy(); o.parent=None; o.matrix_world=world
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
 o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Joining source terrain pieces before decimation prevents seams between chunks.
groups={}
for o in meshes:
 key=tuple(m.name if m else '' for m in o.data.materials)
 groups.setdefault(key,[]).append(o)
for group in groups.values():
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0]
 bpy.ops.object.join()
 o=group[0]
 bm=bmesh.new(); bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00001)
 bm.to_mesh(o.data); bm.free()
 count=len(o.data.polygons)
 budget=35000 if 'Moon' in o.name else 18000
 if count>budget:
  mod=o.modifiers.new('Browser detail','DECIMATE');mod.ratio=budget/count
  bpy.ops.object.modifier_apply(modifier=mod.name)
for i in bpy.data.images:
 if i.size[0]>2048:i.scale(2048,round(i.size[1]*2048/i.size[0]))
bpy.ops.export_scene.gltf(filepath=str(root/'public/art/moon-landing.glb'),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=88,export_animations=False,export_cameras=False,export_lights=False)
print('FINAL',sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'))

