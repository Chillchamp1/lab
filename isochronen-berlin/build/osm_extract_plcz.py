"""OSM-Auszüge für die Erweiterung nach Polen/Tschechien (Geofabrik-PBF, pyosmium; nutzt Filter/Kreisraster/Download
aus osm_extract.py). Regionen: elf polnische Woiwodschaften und Tschechien (Wege, Gleise, Hauptstraßen) sowie die
Bundesländer, in denen Kreise aus data/far_missing6.json liegen (nur Wege; Berlin und Saarland nicht nötig).

Je Region (nacheinander laden -> auswerten -> PBF löschen), Teilergebnisse als gzip-JSONL in plcz_parts/:
  far6   radtaugliche Wege (Filter wie far3/far5) mit >= 1 Knoten in einem Kreis aus data/far_missing6.json (r + 0,3 km)
  rail   railway = rail|light_rail|subway|narrow_gauge      (nur PL/CZ-Regionen)
  major  highway = motorway..tertiary (+ _link)              (nur PL/CZ-Regionen)
Zusammenführen (merge):
  data/overpass_far6.json (+ _done.json), data/osm_rail_plcz.json (ohne Wege, die schon in osm_rail_de.json sind),
  data/overpass_major6.json = overpass_major5.json + PL/CZ-Hauptstraßen (motorway..tertiary in far6-Kreisen + 1 km,
  motorway/trunk/primary im Rahmen lat 48.5-55, lon 7.5-19.5) + DE-Wege aus osm_major_de.json in far6-Kreisen + 1 km.
Eingaben in data/: far_missing6.json (reach_areas_plcz.py), osm_rail_de.json, osm_major_de.json (osm_extract.py),
overpass_major5.json (prep_streets.py). Laufzeit ca. 90 min, vor allem Downloads. peak_mb() im Log nutzt die Windows-API.
Aufruf: python -I -u osm_extract_plcz.py run | extract <pbf> <region> | merge
"""
import gzip, json, math, os, re, shutil, sys, threading, time
import numpy as np
import osmium, osmium.geom
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import osm_extract as OE

sys.stdout.reconfigure(encoding="utf-8")
H = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(H, "data")
PARTS = os.path.join(H, "plcz_parts")
OE.PBF_DIR = os.path.join(H, "plcz_pbf")
CIRC = os.path.join(DATA, "far_missing6.json")
PLCZ = ["poland/" + r for r in ("lubuskie", "zachodniopomorskie", "wielkopolskie", "dolnoslaskie", "kujawsko-pomorskie",
                                "pomorskie", "opolskie", "slaskie", "lodzkie", "malopolskie", "warminsko-mazurskie")] + \
       ["czech-republic"]
DE = ["germany/" + r for r in ("brandenburg", "mecklenburg-vorpommern", "sachsen-anhalt", "sachsen", "thueringen",
                               "niedersachsen", "bremen", "hamburg", "schleswig-holstein", "nordrhein-westfalen", "hessen",
                               "rheinland-pfalz", "bayern", "baden-wuerttemberg")]
REGIONS = PLCZ + DE
BOX = (48.5, 55.0, 7.5, 19.5)


def peak_mb():
    import ctypes, ctypes.wintypes as wt
    class PMC(ctypes.Structure):
        _fields_ = [("cb", wt.DWORD), ("PageFaultCount", wt.DWORD), ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t), ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t), ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t)]
    c = PMC(); c.cb = ctypes.sizeof(PMC)
    k = ctypes.windll.kernel32; k.GetCurrentProcess.restype = wt.HANDLE
    ps = ctypes.windll.psapi; ps.GetProcessMemoryInfo.argtypes = [wt.HANDLE, ctypes.c_void_p, wt.DWORD]
    ps.GetProcessMemoryInfo(k.GetCurrentProcess(), ctypes.byref(c), c.cb)
    return c.PeakWorkingSetSize / 2**20


T00 = time.time()


def log(*a):
    print(f"[{time.time() - T00:6.0f}s {peak_mb():5.0f}MB]", *a, flush=True)


def layers_of(region):
    return ["far6"] + (["rail", "major"] if region in PLCZ else [])


def extract(pbf, region):
    t0 = time.time()
    name = region.split("/")[-1]
    grid = OE.CircleGrid(CIRC)
    os.makedirs(PARTS, exist_ok=True)
    layers = layers_of(region)
    tmp = {L: os.path.join(PARTS, f"{name}.{L}.jsonl.gz.tmp") for L in layers}
    outs = {L: gzip.open(tmp[L], "wt", encoding="utf-8", compresslevel=1) for L in layers}
    cnt = dict.fromkeys(layers, 0); nways = nbad = 0
    want_rm = "rail" in layers
    fp = (osmium.FileProcessor(pbf, osmium.osm.NODE | osmium.osm.WAY).with_locations("flex_mem")
          .with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
          .with_filter(osmium.filter.KeyFilter("highway", "railway") if want_rm else osmium.filter.KeyFilter("highway")))
    dumps = json.dumps; fab = osmium.geom.WKBFactory(); ALL = osmium.geom.ALL

    def rec(wid, tags, keys, coords):
        return dumps([wid, {k: tags[k] for k in keys if k in tags}, coords], separators=(",", ":")) + "\n"

    for w in fp:
        nways += 1
        tags = w.tags
        hw = tags.get("highway"); rw = tags.get("railway")
        is_rail = want_rm and rw in OE.RAIL; is_major = hw in OE.MAJOR
        is_bike = hw is not None and not is_major and OE.bike_ok(tags)
        if not (is_rail or (is_major and want_rm) or is_bike): continue
        try:
            a = np.frombuffer(bytes.fromhex(fab.create_linestring(w, ALL)), dtype="<f8", offset=9).reshape(-1, 2)
        except Exception:
            a = np.array([(n.location.lon, n.location.lat) for n in w.nodes if n.location.valid()], dtype="f8").reshape(-1, 2)
        if len(a) < 2:
            nbad += 1; continue
        coords = None
        if want_rm and (is_rail or is_major):
            coords = a[:, ::-1].round(6).ravel().tolist()
            t = {k: v for k, v in tags}
            if is_rail: outs["rail"].write(rec(w.id, t, OE.KEEP["rail"], coords)); cnt["rail"] += 1
            if is_major: outs["major"].write(rec(w.id, t, OE.KEEP["major"], coords)); cnt["major"] += 1
        if is_bike and grid.hit(a[:, 1], a[:, 0]):
            if coords is None: coords = a[:, ::-1].round(6).ravel().tolist()
            outs["far6"].write(rec(w.id, {k: v for k, v in tags}, OE.KEEP["bike"], coords)); cnt["far6"] += 1
    for L in layers:
        outs[L].close(); os.replace(tmp[L], tmp[L][:-4])
    log(f"[{name}] {time.time() - t0:.0f} s, {nways} Wege gelesen, ohne Geometrie {nbad}; " + ", ".join(f"{L} {cnt[L]}" for L in layers))


def done(region):
    n = region.split("/")[-1]
    return all(os.path.exists(os.path.join(PARTS, f"{n}.{L}.jsonl.gz")) for L in layers_of(region))


def run():
    todo = [r for r in REGIONS if not done(r)]
    log(f"{len(REGIONS)} Regionen, offen {len(todo)}")
    ready = {}; cv = threading.Condition(); err = []

    def downloader():
        try:
            for r in todo:
                size = OE.remote_size(OE.BASE + r + "-latest.osm.pbf") or 1e9
                with cv:
                    while ready and OE.free_bytes() < size + 1.5e9: cv.wait(10)
                    while len(ready) >= 1: cv.wait(5)          # höchstens eine Datei im Voraus
                if OE.free_bytes() < size + 0.8e9:
                    raise RuntimeError(f"zu wenig Platz für {r}: frei {OE.free_bytes() / 1e9:.1f} GB")
                fn = OE.download(r)
                with cv: ready[r] = fn; cv.notify_all()
        except Exception as e:
            err.append(e)
            with cv: cv.notify_all()

    th = threading.Thread(target=downloader, daemon=True); th.start()
    for r in todo:
        with cv:
            while r not in ready and not err: cv.wait(5)
            if r not in ready: raise SystemExit(f"Abbruch: {err[0]}")
            fn = ready[r]
        extract(fn, r)
        os.remove(fn)
        with cv: del ready[r]; cv.notify_all()
        log(f"  frei {OE.free_bytes() / 1e9:.2f} GB")
    th.join()


# ---------------- merge ----------------
def best_lines(files):
    best = {}
    for f in files:
        with gzip.open(f, "rt", encoding="utf-8") as fh:
            for line in fh:
                k = line.index(","); wid = int(line[1:k]); m = line.count(",")
                if best.get(wid, -1) < m: best[wid] = m
    for f in files:
        with gzip.open(f, "rt", encoding="utf-8") as fh:
            for line in fh:
                k = line.index(","); wid = int(line[1:k])
                m = best.get(wid)
                if m is None or line.count(",") != m: continue
                del best[wid]
                yield json.loads(line)


def el(wid, tags, c):
    geom = ",".join(f'{{"lat":{c[q]},"lon":{c[q + 1]}}}' for q in range(0, len(c), 2))
    return '{"id":%d,"tags":%s,"geometry":[%s]}' % (wid, json.dumps(tags, ensure_ascii=False, separators=(",", ":")), geom)


def ids_in_exact(fn):
    pat = re.compile(r'\{"id":(\d+),"tags"')
    txt = open(fn, encoding="utf-8").read()
    s = set(map(int, pat.findall(txt))); del txt
    return s


def xyz(la, lo):
    la, lo = np.radians(la), np.radians(lo)
    return np.c_[np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)]


def ways_in_circles(lat_list, lon_list, pts, extra):
    """bool je Weg: mindestens ein Knoten im Großkreisabstand <= min(r, 12) + extra km von einer Kreismitte"""
    lens = np.array([len(a) for a in lat_list]); n = len(lens)
    if not n: return np.zeros(0, bool)
    la = np.concatenate(lat_list); lo = np.concatenate(lon_list)
    tree = cKDTree(xyz(la, lo)); inside = np.zeros(len(la), bool)
    for p in pts:
        rk = min(p[2], 12.0) + extra
        hit = tree.query_ball_point(xyz(np.array([p[0]]), np.array([p[1]]))[0], 2 * np.sin(rk / 6371.0088 / 2))
        if hit: inside[np.asarray(hit)] = True
    wid = np.repeat(np.arange(n), lens)
    sel = np.zeros(n, bool); sel[np.unique(wid[inside])] = True
    return sel


def merge():
    t0 = time.time()
    pts = json.load(open(CIRC, encoding="utf-8"))
    # far6
    files = [os.path.join(PARTS, f"{r.split('/')[-1]}.far6.jsonl.gz") for r in REGIONS]
    out = os.path.join(DATA, "overpass_far6.json"); n = 0; hw = {}
    with open(out + ".tmp", "w", encoding="utf-8") as fo:
        fo.write('{"elements":[')
        for wid, tags, c in best_lines(files):
            fo.write(("," if n else "") + el(wid, tags, c)); n += 1
            hw[tags.get("highway")] = hw.get(tags.get("highway"), 0) + 1
        fo.write("]}")
    os.replace(out + ".tmp", out)
    json.dump(list(range(len(pts))), open(os.path.join(DATA, "overpass_far6_done.json"), "w"))
    log(f"overpass_far6.json: {n} Wege, {os.path.getsize(out) / 1e6:.1f} MB; highway: {dict(sorted(hw.items(), key=lambda t: -t[1]))}")
    # rail PL/CZ
    de_rail = ids_in_exact(os.path.join(DATA, "osm_rail_de.json"))
    files = [os.path.join(PARTS, f"{r.split('/')[-1]}.rail.jsonl.gz") for r in PLCZ]
    out = os.path.join(DATA, "osm_rail_plcz.json"); n = nskip = 0; rt = {}
    with open(out + ".tmp", "w", encoding="utf-8") as fo:
        fo.write('{"elements":[')
        for wid, tags, c in best_lines(files):
            if wid in de_rail: nskip += 1; continue
            fo.write(("," if n else "") + el(wid, tags, c)); n += 1
            rt[tags.get("railway")] = rt.get(tags.get("railway"), 0) + 1
        fo.write("]}")
    os.replace(out + ".tmp", out)
    log(f"osm_rail_plcz.json: {n} Wege ({rt}), {os.path.getsize(out) / 1e6:.1f} MB; schon in osm_rail_de.json: {nskip}")
    del de_rail
    # major
    m5 = os.path.join(DATA, "overpass_major5.json")
    m5ids = ids_in_exact(m5)
    files = [os.path.join(PARTS, f"{r.split('/')[-1]}.major.jsonl.gz") for r in PLCZ]
    W = []; nsk = 0
    for wid, tags, c in best_lines(files):
        if wid in m5ids: nsk += 1; continue
        W.append((wid, tags, c))
    LA = [np.array(c[0::2]) for _, _, c in W]; LO = [np.array(c[1::2]) for _, _, c in W]
    incirc = ways_in_circles(LA, LO, pts, 1.0)
    inbox = np.array([t.get("highway", "").replace("_link", "") in ("motorway", "trunk", "primary") and
                      bool(((la >= BOX[0]) & (la <= BOX[1]) & (lo >= BOX[2]) & (lo <= BOX[3])).any())
                      for (_, t, _), la, lo in zip(W, LA, LO)], bool)
    add = [el(*W[k]) for k in np.nonzero(incirc | inbox)[0]]
    na, nb = int(incirc.sum()), int((inbox & ~incirc).sum())
    del W, LA, LO
    log(f"PL/CZ-Hauptstraßen: in far6-Kreisen +1 km {na}, nur Übersicht (mtw/trunk/primary im Rahmen) {nb}, schon in major5 {nsk}")
    # DE: osm_major_de.json in far6-Kreisen +1 km, nicht schon in major5
    txt = open(os.path.join(DATA, "osm_major_de.json"), encoding="utf-8").read()
    head, _, rest = txt.partition('{"id":'); del txt
    els = rest.split('{"id":'); del rest
    els = [e[:-1] for e in els[:-1]] + [els[-1].rstrip()[:-2]]
    num = re.compile(r'"lat":([-0-9.]+),"lon":([-0-9.]+)')
    els = [e for e in els if int(e[:e.index(",")]) not in m5ids]
    G = [np.array(num.findall(e), dtype=float).reshape(-1, 2) for e in els]
    sel = ways_in_circles([g[:, 0] for g in G], [g[:, 1] for g in G], pts, 1.0)
    del G
    add += ['{"id":' + els[k] for k in np.nonzero(sel)[0]]; nde = int(sel.sum())
    del els
    log(f"DE-Hauptstraßen aus osm_major_de.json in far6-Kreisen +1 km (neu gegenüber major5): {nde}")
    out = os.path.join(DATA, "overpass_major6.json")
    txt = open(m5, encoding="utf-8").read().rstrip()
    assert txt.endswith("]}")
    with open(out + ".tmp", "w", encoding="utf-8") as fo:
        fo.write(txt[:-2]); del txt
        for a in add: fo.write("," + a)
        fo.write("]}")
    os.replace(out + ".tmp", out)
    chk = json.loads('{"elements":[' + ",".join(add[:1000] + add[-1000:]) + "]}")["elements"]
    assert all(set(w) == {"id", "tags", "geometry"} for w in chk)
    log(f"overpass_major6.json: major5 {len(m5ids)} + {len(add)} Wege, {os.path.getsize(out) / 1e6:.1f} MB, merge {time.time() - t0:.0f} s")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "run":
        run(); merge()
    elif a[0] == "extract":
        extract(a[1], a[2])
    elif a[0] == "merge":
        merge()
    log("fertig")
