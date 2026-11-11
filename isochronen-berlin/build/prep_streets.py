"""Compact street inputs for the 5-h extension: far5_segs.npz, overpass_major5.json (+ major5_segs.npz).
Inputs in data/: overpass_far5.json (osm_extract.py), osm_major_de.json (osm_extract.py), overpass_major.json
(major roads of the core area), far_missing.json + far_missing5.json (reach_areas.py).
Usage: python -I -u prep_streets.py [--far-only] [--segs]   (peak_mb() uses the Windows API)"""
import os, re, sys, json, time, ctypes, ctypes.wintypes as wt
import numpy as np
from scipy.spatial import cKDTree

DD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
T0 = time.time()


def peak_mb():
    class PMC(ctypes.Structure):
        _fields_ = [("cb", wt.DWORD), ("PageFaultCount", wt.DWORD), ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t), ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t), ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t)]
    c = PMC(); c.cb = ctypes.sizeof(PMC)
    k = ctypes.windll.kernel32
    k.GetCurrentProcess.restype = wt.HANDLE
    ps = ctypes.windll.psapi; ps.GetProcessMemoryInfo.argtypes = [wt.HANDLE, ctypes.c_void_p, wt.DWORD]
    ps.GetProcessMemoryInfo(k.GetCurrentProcess(), ctypes.byref(c), c.cb)
    return c.PeakWorkingSetSize / 2**20, c.PeakPagefileUsage / 2**20


def log(*a):
    print(f"[{time.time() - T0:6.1f}s, peak {peak_mb()[0]:6.0f} MB]", *a, flush=True)


def to_e5(x):
    """int32 of round(x, 5) * 1e5 with Python round() semantics (exact decimal, half-even)."""
    y = x * 1e5
    k = np.rint(y)
    amb = np.abs(np.abs(y - np.floor(y)) - 0.5) < 1e-3          # near a .5 tie -> decide like Python round(x, 5)
    idx = np.nonzero(amb)[0]
    k[idx] = [round(round(v, 5) * 1e5) for v in x[idx].tolist()]
    return k.astype(np.int32)


def parse(path):
    """-> raw element strings (without leading '{"id":'), header strings, lat, lon (float64), offsets."""
    txt = open(path, encoding="utf-8").read()
    head, _, rest = txt.partition('{"id":')
    del txt
    els = rest.split('{"id":')
    del rest
    # strip separators: ',' between elements, ']}' closing the file after the last
    els = [e[:-1] for e in els[:-1]] + [els[-1].rstrip()[:-2]]
    log(path, len(els), "elements")
    hdr, npts, parts = [], np.zeros(len(els), np.int64), []
    nums = []
    CH = 100000
    for i, e in enumerate(els):
        j = e.find('"geometry":')
        if j < 0:
            hdr.append(e); parts.append(""); continue
        hdr.append(e[:j])
        g = e[j + 11:]
        npts[i] = g.count("{")
        parts.append(g.replace('{"lat":', "").replace(',"lon":', ",").replace("}", "").replace("[", "").replace("]", ","))
        if len(parts) >= CH:
            nums.append(np.fromstring("".join(parts)[:-1], sep=",")); parts = []
    if parts:
        s = "".join(parts)
        if s:
            nums.append(np.fromstring(s[:-1], sep=","))
    a = np.concatenate(nums)
    assert len(a) == 2 * npts.sum(), (len(a), npts.sum())
    off = np.r_[0, np.cumsum(npts)]
    log("points", len(a) // 2)
    return els, hdr, a[0::2].copy(), a[1::2].copy(), off


def tag(h, k):
    m = re.search('"%s":"([^"]*)"' % k, h)
    return m.group(1) if m else None


def way_segments(off):
    """indices i of point pairs (i, i+1) within one way"""
    n = off[-1]
    ok = np.ones(max(n - 1, 0), bool)
    ends = off[1:-1] - 1
    ok[ends[(ends >= 0) & (ends < n - 1)]] = False
    i = np.nonzero(ok)[0]
    way = np.searchsorted(off, i, side="right") - 1
    return i, way


# ---------------- 1. far5 ----------------
els, hdr, lat, lon, off = parse(os.path.join(DD, "overpass_far5.json"))
del els
X, Y = to_e5(lon), to_e5(lat)
del lat, lon
# cls: 0 other, 1 unclassified, 2 cycleway, 3 track grade1/2/untagged, 4 residential/living_street, 5 service,
#      6 path/footway/bridleway/pedestrian, 7 track grade3/grade4 (other tracktypes -> 0); duplicates: max code wins
HWC = {"unclassified": 1, "cycleway": 2, "residential": 4, "living_street": 4, "service": 5,
       "path": 6, "footway": 6, "bridleway": 6, "pedestrian": 6}
wcls = np.zeros(len(hdr), np.uint8)
hwcount = {}
for k, h in enumerate(hdr):
    hw = tag(h, "highway")
    hwcount[hw] = hwcount.get(hw, 0) + 1
    if hw == "track":
        tt = tag(h, "tracktype") or "grade1"
        wcls[k] = 3 if tt in ("grade1", "grade2") else 7 if tt in ("grade3", "grade4") else 0
    else:
        wcls[k] = HWC.get(hw, 0)
log("highway values (ways)", dict(sorted(hwcount.items(), key=lambda t: -t[1])))
del hdr
i, way = way_segments(off)
x1, y1, x2, y2, c = X[i], Y[i], X[i + 1], Y[i + 1], wcls[way]
del i, way, X, Y
keep = (x1 != x2) | (y1 != y2)
x1, y1, x2, y2, c = x1[keep], y1[keep], x2[keep], y2[keep], c[keep]
nraw = len(x1)
sw = (x1 > x2) | ((x1 == x2) & (y1 > y2))
x1[sw], x2[sw] = x2[sw], x1[sw].copy()
y1[sw], y2[sw] = y2[sw], y1[sw].copy()
p1 = x1.astype(np.int64) * (1 << 24) + y1
p2 = x2.astype(np.int64) * (1 << 24) + y2
o = np.lexsort((-c.astype(np.int16), p2, p1))           # within duplicates: highest class first
p1s, p2s = p1[o], p2[o]
first = np.r_[True, (p1s[1:] != p1s[:-1]) | (p2s[1:] != p2s[:-1])]
grp = np.cumsum(first) - 1
u = o[first]
# class conflicts among duplicates (group contains a lower class than the chosen max)
cs = c[o].astype(np.int64)
gmin = np.full(len(u), 99); np.minimum.at(gmin, grp, cs)
conflicts = int((gmin != cs[first]).sum())
F = dict(lon1=x1[u], lat1=y1[u], lon2=x2[u], lat2=y2[u], cls=c[u])
# nearest station-area centre (far_missing5.json index) to the segment midpoint, great-circle km
ctr = np.array([[a[0], a[1]] for a in json.load(open(os.path.join(DD, "far_missing5.json"), encoding="utf-8"))])
def _xyz(la_, lo_):
    la_, lo_ = np.radians(la_), np.radians(lo_)
    return np.c_[np.cos(la_) * np.cos(lo_), np.cos(la_) * np.sin(lo_), np.sin(la_)]
mlon = (F["lon1"].astype(np.float64) + F["lon2"]) / 2e5
mlat = (F["lat1"].astype(np.float64) + F["lat2"]) / 2e5
dch, nn = cKDTree(_xyz(ctr[:, 0], ctr[:, 1])).query(_xyz(mlat, mlon), k=1)
F["near"] = nn.astype(np.int16)
F["dkm"] = (2 * 6371.0088 * np.arcsin(np.minimum(dch / 2, 1.0))).astype(np.float32)
del mlon, mlat, dch, nn
log("near/dkm: dkm min %.3f median %.2f p99 %.2f max %.2f" % (F["dkm"].min(), np.median(F["dkm"]),
    np.percentile(F["dkm"], 99), F["dkm"].max()), "share <=13 km %.4f" % (F["dkm"] <= 13).mean())
np.savez_compressed(os.path.join(DD, "far5_segs.npz"), **F)
log("far5: segments raw (non-zero)", nraw, "unique", len(u), "duplicate groups with differing classes", conflicts,
    "per class", {int(k): int(v) for k, v in zip(*np.unique(F["cls"], return_counts=True))},
    "file MB", round(os.path.getsize(os.path.join(DD, "far5_segs.npz")) / 2**20, 1))
del x1, y1, x2, y2, c, p1, p2, o, p1s, p2s, first, grp, cs, F, u, keep, sw
if "--far-only" in sys.argv:
    log("done (far only); peak working set %.0f MB, peak commit %.0f MB" % peak_mb())
    sys.exit(0)

# ---------------- 2. major5 ----------------
om = json.load(open(os.path.join(DD, "overpass_major.json"), encoding="utf-8"))["elements"]
la = [p["lat"] for w in om for p in w.get("geometry", [])]
lo = [p["lon"] for w in om for p in w.get("geometry", [])]
BB = (min(la), max(la), min(lo), max(lo))
del om, la, lo
log("bbox overpass_major.json lat %.4f..%.4f lon %.4f..%.4f" % BB)
circ = json.load(open(os.path.join(DD, "far_missing5.json"), encoding="utf-8")) + \
       json.load(open(os.path.join(DD, "far_missing.json"), encoding="utf-8"))

els, hdr, lat, lon, off = parse(os.path.join(DD, "osm_major_de.json"))
npt = len(lat)
inside = (lat >= BB[0]) & (lat <= BB[1]) & (lon >= BB[2]) & (lon <= BB[3])
R = 6371.0088


def xyz(la_, lo_):
    la_, lo_ = np.radians(la_), np.radians(lo_)
    return np.c_[np.cos(la_) * np.cos(lo_), np.cos(la_) * np.sin(lo_), np.sin(la_)]


cand = np.nonzero(~inside)[0]
tree = cKDTree(xyz(lat[cand], lon[cand]))
for la_, lo_, r, *_ in circ:
    rk = min(r, 12.0) + 1.0
    ch = 2 * np.sin(rk / R / 2)                            # chord for great-circle distance rk
    hit = tree.query_ball_point(xyz(np.array([la_]), np.array([lo_]))[0], ch, return_sorted=False)
    if hit:
        inside[cand[np.asarray(hit)]] = True
del tree, cand
wid = np.repeat(np.arange(len(off) - 1), np.diff(off))
sel = np.zeros(len(off) - 1, bool)
sel[np.unique(wid[inside])] = True
hws = [tag(h, "highway") or "" for h in hdr]
base = np.array([h.replace("_link", "") for h in hws])
ov_pt = (lat >= 48.5) & (lat <= 55.0) & (lon >= 7.5) & (lon <= 17.5)
ov = np.zeros(len(sel), bool); ov[np.unique(wid[ov_pt])] = True
ov &= np.isin(base, ["motorway", "trunk", "primary"])
log("major ways: area-selected", int(sel.sum()), "overview mtw/trunk/primary(+links)", int(ov.sum()),
    "overview-only", int((ov & ~sel).sum()))
sel |= ov
out = os.path.join(DD, "overpass_major5.json")
if os.path.exists(out):
    os.remove(out)                                         # obsolete partial leftover
with open(out, "w", encoding="utf-8") as f:
    f.write('{"elements":[')
    f.write(",".join('{"id":' + els[k] for k in np.nonzero(sel)[0]))
    f.write("]}")
mb = os.path.getsize(out) / 2**20
log("overpass_major5.json", int(sel.sum()), "of", len(sel), "ways,", round(mb, 1), "MB")
# sanity: parse a sample back
chk = json.loads('{"elements":[' + ",".join('{"id":' + els[k] for k in np.nonzero(sel)[0][:2000]) + "]}")
assert all(set(w) == {"id", "tags", "geometry"} for w in chk["elements"])

if mb > 300 or "--segs" in sys.argv:
    del els
    CODE = {"motorway": 0, "trunk": 1, "primary": 2, "secondary": 3, "tertiary": 4}
    wc = np.array([CODE.get(b, 250) + (10 if h.endswith("_link") else 0) for h, b in zip(hws, base)], np.uint8)
    ms = np.array([int(m) if (m := tag(h, "maxspeed") or "").isdigit() else 0 for h in hdr], np.int16)
    X, Y = to_e5(lon), to_e5(lat)
    i, way = way_segments(off)
    m = sel[way]
    i, way = i[m], way[m]
    x1, y1, x2, y2 = X[i], Y[i], X[i + 1], Y[i + 1]
    keep = (x1 != x2) | (y1 != y2)
    M = dict(lon1=x1[keep], lat1=y1[keep], lon2=x2[keep], lat2=y2[keep], cls=wc[way[keep]], maxspeed=ms[way[keep]])
    np.savez_compressed(os.path.join(DD, "major5_segs.npz"), **M)
    log("major5_segs.npz", len(M["cls"]), "segments,", round(os.path.getsize(os.path.join(DD, "major5_segs.npz")) / 2**20, 1), "MB",
        "per class", {int(k): int(v) for k, v in zip(*np.unique(M["cls"], return_counts=True))},
        "maxspeed>0", int((M["maxspeed"] > 0).sum()))
log("done; peak working set %.0f MB, peak commit %.0f MB" % peak_mb())
