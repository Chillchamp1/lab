"""Hop-Kodierung (wie encode_hops in build_isochronen.py / decodeHops in template.html).
Hop = (t0, t1, mode, q) mit q = int64-Array Nx2 (round((lon-LON)*1e5), round((lat-LAT)*1e5))."""
import base64
import numpy as np


def decode_hops(b64):
    u = base64.b64decode(b64); n = len(u); p = 0
    def raw():
        nonlocal p
        r = 0; s = 0
        while True:
            b = u[p]; p += 1
            r |= (b & 127) << s; s += 7
            if not b & 128:
                return r
    hops = []; px = py = 0
    while p < n:
        npt = raw(); t0 = raw(); t1 = raw(); m = raw()
        q = np.empty((npt, 2), dtype=np.int64)
        for k in range(npt):
            dx = raw(); dy = raw()
            px += (dx >> 1) ^ -(dx & 1); py += (dy >> 1) ^ -(dy & 1)
            q[k] = (px, py)
        hops.append((t0, t1, m, q))
    return hops


def encode_hops(hops):
    buf = bytearray(); prev = np.zeros(2, dtype=np.int64)
    def vints(vals):
        for v in vals:
            v = int(v)
            assert v >= 0
            while v >= 0x80:
                buf.append((v & 0x7F) | 0x80); v >>= 7
            buf.append(v)
    zz = lambda v: (v << 1) ^ (v >> 63)
    for t0, t1, m, q in hops:
        q = np.asarray(q, dtype=np.int64)
        vints([len(q), t0, t1, m])
        vints(zz(np.diff(np.vstack([prev, q]), axis=0).ravel()).tolist()); prev = q[-1]
    return base64.b64encode(bytes(buf)).decode()
