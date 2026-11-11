"""Beschriftungskacheln verkleinern: fast unsichtbare Halo-Pixel (Alpha < 14) entfernen, Alpha leicht quantisieren."""
import os, numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tiles_lab")
b0 = b1 = 0
for f in os.listdir(D):
    p = os.path.join(D, f); b0 += os.path.getsize(p)
    a = np.asarray(Image.open(p).convert("RGBA")).copy()
    al = a[..., 3].astype(int)
    al[al < 14] = 0
    al = np.where(al < 250, (al // 4) * 4, 255)
    a[..., 3] = al; a[al == 0, :3] = 0
    Image.fromarray(a, "RGBA").save(p, "WEBP", lossless=True, quality=75, method=4)
    b1 += os.path.getsize(p)
print(round(b0 / 1e6, 1), "MB ->", round(b1 / 1e6, 1), "MB")
