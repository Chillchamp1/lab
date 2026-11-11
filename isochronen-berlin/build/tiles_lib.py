"""Helpers for the dark base-map tiles (used by tiles_split.py and tiles_lowzoom.py).

Render crops: each render region [z, x0, y0, x1, y1] is one PNG of (x1-x0+1)*256 + 2*M CSS px per side at
pixel ratio PR, written by render_tiles.html; crops() cuts it into 512-px tiles.
Low zooms: box (area) 2x downscale of the child-zoom *unlifted* backgrounds, then a mild hue-preserving
contrast lift away from the base colour (lift, LIFT_K).
"""
import os
import numpy as np
from PIL import Image

W = os.path.dirname(os.path.abspath(__file__)) + "/"
REN = W + "renders/"
M = 256
PR = 2
T = 512
BASE = np.array([11, 12, 14], np.float32)
WEBP = dict(quality=74, method=6)
# contrast lift: m -> m*(1 + k*(1 - m/DREF)) for 0<m<DREF (m = max positive channel diff from base)
DREF = 19.0  # built-up patch (26,28,33) has max diff 19 -> stays exactly that bright
LIFT_K = {10: 0.30, 9: 0.40, 8: 0.45}



def img_size(r):
    z, x0, y0, x1, y1 = r
    return (((x1 - x0 + 1) * 256 + 2 * M) * PR, ((y1 - y0 + 1) * 256 + 2 * M) * PR)


def crops(path, r, mode):
    """yield (x, y, crop ndarray) for each tile in render region r"""
    im = Image.open(path).convert(mode)
    assert im.size == img_size(r), (path, im.size, img_size(r))
    a = np.asarray(im)
    z, x0, y0, x1, y1 = r
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            l = (M + (x - x0) * 256) * PR
            t = (M + (y - y0) * 256) * PR
            yield x, y, a[t:t + T, l:l + T]


def down2(a):
    """box/area 2x downscale, float32 HxWx3"""
    h, w, _ = a.shape
    return a.reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))


def lift(a, k):
    d = a - BASE
    pos = np.maximum(d, 0)
    m = pos.max(-1, keepdims=True)
    gain = np.where((m > 0) & (m < DREF), 1 + k * (1 - m / DREF), 1.0)
    return BASE + np.where(d > 0, d * gain, d)


def to_u8(a):
    return np.clip(a + 0.5, 0, 255).astype(np.uint8)
