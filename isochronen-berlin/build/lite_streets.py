"""Leichte Web-Fassung der Straßendaten: Linien je nach Zeitband und Rangstufe ausdünnen und neu kodieren.
Aufruf: python -I lite_streets.py IN.json OUT.json [--stats]"""
import sys, json, base64, numpy as np

def decode(b64):
    u = np.frombuffer(base64.b64decode(b64), np.uint8); p = 0; n = len(u)
    def raw():
        nonlocal p
        r = 0; s = 0
        while True:
            b = int(u[p]); p += 1; r |= (b & 127) << s; s += 7
            if not b & 128: return r
    def rd():
        r = raw(); return -((r + 1) >> 1) if r & 1 else r >> 1
    return raw, rd, lambda: p < n

def parse(b64, NB):
    raw, rd, more = decode(b64); px = py = 0; out = []
    for b in range(1, NB + 1):
        nl = rd(); lines = []
        for _ in range(nl):
            npt = rd(); code = raw(); pts = []
            for _k in range(npt):
                px += rd(); py += rd(); pts.append((px, py))
            lines.append((code, pts))
        out.append(lines)
    return out

def encode(buckets):
    buf = bytearray(); prev = [0, 0]
    def v(x):
        while x >= 0x80: buf.append((x & 0x7F) | 0x80); x >>= 7
        buf.append(x)
    zz = lambda x: (x << 1) if x >= 0 else ((-x) << 1) - 1
    for lines in buckets:
        v(zz(len(lines)))
        for code, pts in lines:
            v(zz(len(pts))); v(code)
            for x, y in pts:
                v(zz(x - prev[0])); v(zz(y - prev[1])); prev = [x, y]
    return base64.b64encode(bytes(buf)).decode()

if __name__ == "__main__":
    d = json.load(open(sys.argv[1])); m = d["origins"]["hbf"]["modes"]["biketransit"] if "origins" in d else d["modes"]["biketransit"]
    STEP = d["step"]; NB = m["tmax"] // STEP
    B = parse(m["data"], NB)
    if "--stats" in sys.argv:
        st = {}
        for b, lines in enumerate(B, 1):
            band = min(5, (b * STEP - 1) // 3600)       # Stunde 0..4
            for code, pts in lines:
                k = (band, code >> 3); e = st.setdefault(k, [0, 0]); e[0] += 1; e[1] += len(pts)
        for k in sorted(st): print("Stunde", k[0], "Rang", k[1], "Linien", st[k][0], "Punkte", st[k][1])
        sys.exit()

    # Web-Fassung: bis 2 h alles, 2–3 h Hauptnetz inkl. Radwege/befestigte Wege, ab 3 h nur Fernstraßen
    def keep(b, code):
        t = b * STEP; lev = code >> 3
        return t <= 7200 or (t <= 10800 and lev >= 1) or lev >= 2
    B2 = [[ln for ln in lines if keep(b, ln[0])] for b, lines in enumerate(B, 1)]
    n0 = sum(len(x) for x in B); n1 = sum(len(x) for x in B2)
    m["data"] = encode(B2)
    json.dump(d, open(sys.argv[2], "w"), separators=(",", ":"))
    print("Linien", n0, "->", n1, "; Datei", round(len(json.dumps(d, separators=(",", ":"))) / 1e6, 1), "MB")
