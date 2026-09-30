"""Lichtkarte fuer die WebGL-Ansicht der Web-Karte backen (30.09.2026).

blender -b Eiszeit-Europa.blend -S Map -P scripts/runtime.py -P scripts/bake_licht.py

Heutiges Gelaende (Bild 1740), neutrales Licht: Hauptsonne weiss aus Nordwest (wie im Film),
Himmel grau. Material: weiss, diffus, mit dem Relief-Detail als Bump (1,5-km-Relief auf dem 3-km-Netz).
Gebacken wird DIFFUSE (direkt + indirekt, ohne Farbe) = reine Beleuchtung inkl. Schlagschatten.
Ergebnis: tests/licht/licht_3040.png (16 bit, Norden oben, Kartenausschnitt 0..1).
"""
import math
import os
import sys
import time

import bpy

sys.path.insert(0, r"C:\Users\benja\Videos\Eiszeit-Europa\scripts")
import eiszeit_core as C

B, HB = int(os.environ.get("LICHT_B", "3040")), int(os.environ.get("LICHT_H", "3548"))
SPP = int(os.environ.get("LICHT_SPP", "256"))
sc = bpy.data.scenes["Map"]
sc.frame_set(C.FRAMES)                       # heute

# Nur Gelaende und Licht
from mathutils import Vector
ZUR_SONNE = Vector([float(v) for v in os.environ.get("LICHT_SONNE", "-0.70,0.62,0.36").split(",")]).normalized()
for ob in sc.objects:
    if ob.type == "MESH" and ob.name != "Europa":
        ob.hide_render = True
    if ob.name == "Sonne":
        ob.rotation_euler = (-ZUR_SONNE).to_track_quat("-Z", "Y").to_euler()
    if ob.type == "LIGHT":
        ob.hide_render = ob.name not in ("Sonne", "Himmel_oben")
        if ob.name == "Sonne":
            ob.data.color = (1.0, 1.0, 1.0)
        if ob.name == "Himmel_oben":
            ob.data.color = (1.0, 1.0, 1.0)
# Welt: neutrales Grau
w = sc.world
w.use_nodes = True
wn = w.node_tree.nodes
wl = w.node_tree.links
for n in list(wn):
    wn.remove(n)
bg = wn.new("ShaderNodeBackground"); bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 0.3
wo = wn.new("ShaderNodeOutputWorld"); wl.new(bg.outputs[0], wo.inputs[0])

# Backmaterial
mat = bpy.data.materials.new("LichtBacken")
mat.use_nodes = True
N, L = mat.node_tree.nodes, mat.node_tree.links
for n in list(N):
    N.remove(n)
out = N.new("ShaderNodeOutputMaterial")
dif = N.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (0.8, 0.8, 0.8, 1)
uv = N.new("ShaderNodeUVMap"); uv.uv_map = "Karte"
rel = N.new("ShaderNodeTexImage")
rel.image = bpy.data.images.load(str(C.DATA / "relief_detail.png"), check_existing=True)
rel.image.colorspace_settings.name = "Non-Color"
rel.interpolation = "Cubic"; rel.extension = "EXTEND"
L.new(uv.outputs["UV"], rel.inputs["Vector"])
mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY_ADD"
mm.inputs[1].default_value = 6553.5; mm.inputs[2].default_value = -3276.8
L.new(rel.outputs["Color"], mm.inputs[0])
bump = N.new("ShaderNodeBump")
bump.inputs["Distance"].default_value = C.EXAG / (C.BU_KM * 1000.0)
bump.inputs["Strength"].default_value = 1.0
L.new(mm.outputs[0], bump.inputs["Height"])
L.new(bump.outputs["Normal"], dif.inputs["Normal"])
L.new(dif.outputs[0], out.inputs["Surface"])
ziel = N.new("ShaderNodeTexImage")
img = bpy.data.images.new("Licht", B, HB, alpha=False, float_buffer=True)
ziel.image = img
N.active = ziel
ziel.select = True

ob = bpy.data.objects["Europa"]
alte = [s.material for s in ob.material_slots]
for s in ob.material_slots:
    s.material = mat

sc.render.engine = "CYCLES"
cy = sc.cycles
cy.device = "GPU"
cy.samples = SPP
cy.use_denoising = False
cy.max_bounces = 4
cy.diffuse_bounces = 3
bk = sc.render.bake
bk.use_pass_direct = True
bk.use_pass_indirect = True
bk.use_pass_color = False
bk.margin = 4
bk.target = "IMAGE_TEXTURES"
bpy.context.view_layer.objects.active = ob
for o in sc.objects:
    o.select_set(o == ob)
t0 = time.time()
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=4)
print(f"BAKE OK {time.time() - t0:.0f} s", flush=True)
os.makedirs(r"C:\Users\benja\Videos\Eiszeit-Europa\tests\licht", exist_ok=True)
img.filepath_raw = r"C:\Users\benja\Videos\Eiszeit-Europa\tests\licht\licht_roh.exr"
img.file_format = "OPEN_EXR"
img.save()
import numpy as np
px = np.empty(B * HB * 4, np.float32)
img.pixels.foreach_get(px)
lum = px.reshape(HB, B, 4)[::-1, :, 0]            # Blender-Bildzeile 0 = Sueden -> Norden oben
np.save(r"C:\Users\benja\Videos\Eiszeit-Europa\tests\licht\licht.npy", lum.astype(np.float32))
print("GESPEICHERT", img.filepath_raw, float(lum.min()), float(np.median(lum)), float(lum.max()), flush=True)
