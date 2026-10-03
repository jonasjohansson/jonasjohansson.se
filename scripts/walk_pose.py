"""Pose a rigged scan on a frame of its own animation and save it as a still
mesh, for scripts/walk_scene.py. Runs inside Blender, without its window:

    Blender -b --python scripts/walk_pose.py -- in.glb out.glb 0.5

The last argument is how far through the animation, 0 to 1. Kana sits with
her hands forward, as if holding a paper open, halfway through hers.
"""
import bpy, sys
src, dst, at = sys.argv[-3], sys.argv[-2], float(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
action = bpy.data.actions[0]
start, end = action.frame_range
frame = int(start + (end - start) * at)
bpy.context.scene.frame_set(frame)
depsgraph = bpy.context.evaluated_depsgraph_get()
for obj in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    baked = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    still = bpy.data.objects.new(obj.name + '_posed', baked)
    still.matrix_world = obj.matrix_world.copy()
    bpy.context.scene.collection.objects.link(still)
for obj in [o for o in bpy.context.scene.objects if not o.name.endswith('_posed')]:
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=False, export_skins=False)
print('POSED frame', frame, 'of', start, end)
