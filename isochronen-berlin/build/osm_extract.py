"""OSM-Extrakte aus Geofabrik-PBF statt Overpass (pyosmium, ein Lesedurchgang je PBF-Datei).

Ausgaben (Overpass-ähnlich: {"elements":[{"id","tags","geometry":[{"lat","lon"},...]}]}, Koordinaten auf 6 Stellen):
  data/osm_rail_de.json    railway = rail|light_rail|subway|narrow_gauge            Tags railway, service, usage
  data/osm_major_de.json   highway = motorway..tertiary (+ _link)                    Tags highway, maxspeed
  data/overpass_far3.json  radtaugliche Wege mit >= 1 Knoten in einem Kreis aus data/far_missing.json (r max. 12 km, +TOL)
  data/overpass_far5.json  dito für data/far_missing5.json, ohne Wege, die schon in far3 sind
     Radfilter: residential|living_street|unclassified|cycleway|road; service außer parking_aisle|driveway|drive-through;
     track außer tracktype=grade5; path|footway|bridleway nur bicycle=yes|designated|permissive; pedestrian nur
     bicycle=yes|designated; access=private|no raus, außer bicycle=yes|designated. Tags highway, tracktype, bicycle, surface.
  dazu data/overpass_far3_done.json (alle Blockindizes, Blöcke zu 12 Kreisen) und data/overpass_far5_done.json
  (alle Gebietsindizes), damit andere Skripte die Abfragen als vollständig ansehen.

Weil auf der Platte kein Platz für germany-latest.osm.pbf (4,9 GB) ist, werden die 16 Länder-Extrakte (+ 2 polnische
Woiwodschaften) nacheinander geladen (curl, MD5-Prüfung), verarbeitet und wieder gelöscht. Teilergebnisse je Region als
gzip-JSONL in osm_parts/; beim Zusammenführen werden an Landesgrenzen doppelte Wege entfernt (längste Geometrie gewinnt).

Aufruf:
  python -I -u osm_extract.py run                       # alles: laden, extrahieren, löschen, zusammenführen
  python -I -u osm_extract.py extract <pbf> <region>    # nur eine Datei -> osm_parts/<region>.*.jsonl.gz
  python -I -u osm_extract.py merge                     # nur zusammenführen
Optionen: --circles NAME=circles.json[,NAME2=...]  (Standard: far3=data/far_missing.json, far5=data/far_missing5.json
          falls vorhanden); Reihenfolge = Priorität, spätere Mengen ohne Wege früherer Mengen.
"""
import gzip, hashlib, json, math, os, shutil, subprocess, sys, threading, time

import numpy as np
import osmium
import osmium.geom

H = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(H, "data")
PBF_DIR = os.path.join(H, "osm_pbf")
PARTS = os.path.join(H, "osm_parts")
UA = "isochrone-demo/1.0"
BASE = "https://download.geofabrik.de/europe/"
REGIONS = ["germany/" + r for r in (
    "brandenburg", "berlin", "mecklenburg-vorpommern", "sachsen-anhalt", "sachsen", "thueringen", "niedersachsen",
    "bremen", "hamburg", "schleswig-holstein", "nordrhein-westfalen", "hessen", "rheinland-pfalz", "saarland",
    "bayern", "baden-wuerttemberg")] + ["poland/zachodniopomorskie", "poland/lubuskie"]
TOL = 0.3            # km Zugabe zum Kreisradius
RMAX = 12.0
KY = 111.2

RAIL = {"rail", "light_rail", "subway", "narrow_gauge"}
MAJOR = {"motorway", "trunk", "primary", "secondary", "tertiary",
         "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"}
BIKE_PLAIN = {"residential", "living_street", "unclassified", "cycleway", "road"}
BAD_SERVICE = {"parking_aisle", "driveway", "drive-through"}
PATHS = {"path", "footway", "bridleway"}
BIKE_YDP = {"yes", "designated", "permissive"}
BIKE_YD = {"yes", "designated"}
KEEP = {"rail": ("railway", "service", "usage"), "major": ("highway", "maxspeed"),
        "bike": ("highway", "tracktype", "bicycle", "surface")}


def default_circles():
    out = [("far3", os.path.join(DATA, "far_missing.json"))]
    if os.path.exists(os.path.join(DATA, "far_missing5.json")):
        out.append(("far5", os.path.join(DATA, "far_missing5.json")))
    return out


def parse_circles(argv):
    for i, a in enumerate(argv):
        if a == "--circles":
            return [(kv.split("=", 1)[0], os.path.join(H, kv.split("=", 1)[1])) for kv in argv[i + 1].split(",")]
    return default_circles()


def bike_ok(t):
    h = t.get("highway")
    if h in BIKE_PLAIN:
        pass
    elif h == "service":
        if t.get("service") in BAD_SERVICE: return False
    elif h == "track":
        if t.get("tracktype") == "grade5": return False
    elif h in PATHS:
        if t.get("bicycle") not in BIKE_YDP: return False
    elif h == "pedestrian":
        if t.get("bicycle") not in BIKE_YD: return False
    else:
        return False
    if t.get("access") in ("private", "no") and t.get("bicycle") not in BIKE_YD:
        return False
    return True


class CircleGrid:
    """Rasterindex der Kreise: Zelle 0 = außerhalb aller Kreise, 1 = ganz in einem Kreis, 2 = Rand (exakt prüfen)."""
    RES_LAT, RES_LON = 0.005, 0.0075

    def __init__(self, fn):
        pts = json.load(open(fn, encoding="utf-8"))
        self.n = len(pts)
        C = [(p[0], p[1], min(p[2], RMAX) + TOL) for p in pts]
        self.lat0 = min(c[0] for c in C) - 0.2; self.lon0 = min(c[1] for c in C) - 0.3
        self.nr = int((max(c[0] for c in C) + 0.2 - self.lat0) / self.RES_LAT) + 1
        self.nc = int((max(c[1] for c in C) + 0.3 - self.lon0) / self.RES_LON) + 1
        st = bytearray(self.nr * self.nc); cand = {}
        for la, lo, R in C:
            kx = KY * math.cos(math.radians(la))
            i0 = int((la - R / KY - self.lat0) / self.RES_LAT); i1 = int((la + R / KY - self.lat0) / self.RES_LAT)
            j0 = int((lo - R / kx - self.lon0) / self.RES_LON); j1 = int((lo + R / kx - self.lon0) / self.RES_LON)
            for i in range(max(i0, 0), min(i1, self.nr - 1) + 1):
                s = self.lat0 + i * self.RES_LAT; n = s + self.RES_LAT
                dy_min = 0.0 if s <= la <= n else min(abs(s - la), abs(n - la)) * KY
                dy_max = max(abs(s - la), abs(n - la)) * KY
                for j in range(max(j0, 0), min(j1, self.nc - 1) + 1):
                    k = i * self.nc + j
                    if st[k] == 1: continue
                    w = self.lon0 + j * self.RES_LON; e = w + self.RES_LON
                    dx_min = 0.0 if w <= lo <= e else min(abs(w - lo), abs(e - lo)) * kx
                    if dx_min * dx_min + dy_min * dy_min > R * R: continue
                    dx_max = max(abs(w - lo), abs(e - lo)) * kx
                    if dx_max * dx_max + dy_max * dy_max <= R * R:
                        st[k] = 1; cand.pop(k, None)
                    else:
                        st[k] = 2; cand.setdefault(k, []).append((la, lo, kx, R * R))
        self.st_np = np.frombuffer(bytes(st), dtype=np.uint8); self.cand = cand

    def hit(self, lat, lon):
        """lat, lon: numpy-Arrays der Wegknoten."""
        i = ((lat - self.lat0) / self.RES_LAT).astype(np.int64); j = ((lon - self.lon0) / self.RES_LON).astype(np.int64)
        ok = (i >= 0) & (j >= 0) & (i < self.nr) & (j < self.nc)
        if not ok.any(): return False
        k = i[ok] * self.nc + j[ok]
        s = self.st_np[k]
        if (s == 1).any(): return True
        q = np.nonzero(s == 2)[0]
        if not len(q): return False
        la_ok = lat[ok]; lo_ok = lon[ok]
        for p in q:
            la = la_ok[p]; lo = lo_ok[p]
            for cla, clo, kx, R2 in self.cand[int(k[p])]:
                dy = (la - cla) * KY; dx = (lo - clo) * kx
                if dx * dx + dy * dy <= R2: return True
        return False


def extract(pbf, region, circles):
    t0 = time.time()
    grids = [(name, CircleGrid(fn)) for name, fn in circles]
    print(f"[{region}] Kreisraster fertig ({', '.join(f'{n}: {g.n} Kreise' for n, g in grids)})", flush=True)
    os.makedirs(PARTS, exist_ok=True)
    layers = ["rail", "major"] + [n for n, _ in grids]
    tmp = {L: os.path.join(PARTS, f"{region}.{L}.jsonl.gz.tmp") for L in layers}
    outs = {L: gzip.open(tmp[L], "wt", encoding="utf-8", compresslevel=1) for L in layers}
    cnt = dict.fromkeys(layers, 0); nbad = 0; nways = 0
    fp = (osmium.FileProcessor(pbf, osmium.osm.NODE | osmium.osm.WAY).with_locations("flex_mem")
          .with_filter(osmium.filter.EntityFilter(osmium.osm.WAY))
          .with_filter(osmium.filter.KeyFilter("highway", "railway")))
    dumps = json.dumps; fab = osmium.geom.WKBFactory(); ALL = osmium.geom.ALL

    def rec(wid, tags, keys, coords):
        return dumps([wid, {k: tags[k] for k in keys if k in tags}, coords], separators=(",", ":")) + "\n"

    for w in fp:
        nways += 1
        tags = w.tags
        hw = tags.get("highway"); rw = tags.get("railway")
        is_rail = rw in RAIL; is_major = hw in MAJOR
        is_bike = hw is not None and not is_major and bike_ok(tags)
        if not (is_rail or is_major or is_bike): continue
        try:
            a = np.frombuffer(bytes.fromhex(fab.create_linestring(w, ALL)), dtype="<f8", offset=9).reshape(-1, 2)
        except Exception:      # ungültige Knoten (fehlen im Extrakt) -> nur gültige nehmen
            a = np.array([(n.location.lon, n.location.lat) for n in w.nodes if n.location.valid()], dtype="f8").reshape(-1, 2)
        if len(a) < 2:
            nbad += 1; continue
        lat = a[:, 1]; lon = a[:, 0]
        coords = None; wid = w.id
        if is_rail or is_major:
            coords = a[:, ::-1].round(6).ravel().tolist()
            t = {k: v for k, v in tags}
            if is_rail:
                outs["rail"].write(rec(wid, t, KEEP["rail"], coords)); cnt["rail"] += 1
            if is_major:
                outs["major"].write(rec(wid, t, KEEP["major"], coords)); cnt["major"] += 1
        if is_bike:
            line = None
            for name, g in grids:
                if g.hit(lat, lon):
                    if line is None:
                        if coords is None: coords = a[:, ::-1].round(6).ravel().tolist()
                        line = rec(wid, {k: v for k, v in tags}, KEEP["bike"], coords)
                    outs[name].write(line); cnt[name] += 1
    for L in layers:
        outs[L].close(); os.replace(tmp[L], tmp[L][:-4])
    dt = time.time() - t0
    print(f"[{region}] {dt:.0f} s, {nways} Wege mit highway/railway gelesen, ohne Geometrie {nbad}; " +
          ", ".join(f"{L} {cnt[L]}" for L in layers), flush=True)
    return dt


def merge(circles, regions):
    names = [r.split("/")[-1] for r in regions]
    layers = [("rail", "osm_rail_de.json"), ("major", "osm_major_de.json")] + \
             [(n, f"overpass_{n}.json") for n, _ in circles]
    seen_prev = set()      # Wege früherer Kreismengen (far3 vor far5)
    res = {}
    for L, fn in layers:
        t0 = time.time()
        files = [os.path.join(PARTS, f"{n}.{L}.jsonl.gz") for n in names]
        missing = [f for f in files if not os.path.exists(f)]
        if missing: raise SystemExit(f"fehlende Teile für {L}: {missing}")
        best = {}
        for f in files:
            with gzip.open(f, "rt", encoding="utf-8") as fh:
                for line in fh:
                    k = line.index(","); wid = int(line[1:k]); m = line.count(",")
                    if best.get(wid, -1) < m: best[wid] = m
        is_circ = L not in ("rail", "major")
        out = os.path.join(DATA, fn); tmp = out + ".tmp"; n_out = 0
        with open(tmp, "w", encoding="utf-8") as fo:
            fo.write('{"elements":[')
            for f in files:
                with gzip.open(f, "rt", encoding="utf-8") as fh:
                    for line in fh:
                        k = line.index(","); wid = int(line[1:k])
                        m = best.get(wid)
                        if m is None or line.count(",") != m: continue
                        del best[wid]
                        if is_circ and wid in seen_prev: continue
                        wid, tags, c = json.loads(line)
                        geom = ",".join(f'{{"lat":{c[q]},"lon":{c[q + 1]}}}' for q in range(0, len(c), 2))
                        fo.write(("," if n_out else "") + '{"id":%d,"tags":%s,"geometry":[%s]}' % (
                            wid, json.dumps(tags, ensure_ascii=False, separators=(",", ":")), geom))
                        n_out += 1
                        if is_circ: seen_prev.add(wid)
            fo.write("]}")
        os.replace(tmp, out)
        res[L] = (n_out, os.path.getsize(out))
        print(f"merge {fn}: {n_out} Wege, {os.path.getsize(out) / 1e6:.1f} MB, {time.time() - t0:.0f} s", flush=True)
        if is_circ:
            pts = json.load(open(dict(circles)[L], encoding="utf-8"))
            if L == "far3":
                done = list(range((len(pts) + 11) // 12))          # Blockschema: je 12 Kreise
            else:
                done = list(range(len(pts)))                       # Gebietsindizes
            json.dump(done, open(os.path.join(DATA, f"overpass_{L}_done.json"), "w"))
    return res


def free_bytes():
    return shutil.disk_usage(H).free


def remote_size(url):
    r = subprocess.run(["curl", "-sIL", "-A", UA, url], capture_output=True, text=True)
    size = None
    for line in r.stdout.splitlines():
        if line.lower().startswith("content-length:"): size = int(line.split(":")[1])
    return size


def md5_of(fn):
    h = hashlib.md5()
    with open(fn, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""): h.update(b)
    return h.hexdigest()


def download(region):
    """Lädt <region>-latest.osm.pbf nach osm_pbf/ (mit Fortsetzen) und prüft die MD5. Gibt den Pfad zurück."""
    os.makedirs(PBF_DIR, exist_ok=True)
    name = region.split("/")[-1] + "-latest.osm.pbf"
    url = BASE + region + "-latest.osm.pbf"; fn = os.path.join(PBF_DIR, name)
    r = subprocess.run(["curl", "-sfL", "-A", UA, url + ".md5"], capture_output=True, text=True)
    want = r.stdout.split()[0] if r.returncode == 0 and r.stdout else None
    if not want: raise RuntimeError(f"keine MD5 für {region}")
    for attempt in range(4):
        t0 = time.time()
        subprocess.run(["curl", "-sSL", "--retry", "5", "--retry-delay", "10", "-C", "-", "-A", UA, "-o", fn, url])
        got = md5_of(fn)
        if got == want:
            mb = os.path.getsize(fn) / 1e6
            print(f"  geladen {name}: {mb:.0f} MB in {time.time() - t0:.0f} s, MD5 ok", flush=True)
            return fn
        print(f"  MD5 falsch für {name} ({got} != {want}), neu laden", flush=True)
        os.remove(fn)
    raise RuntimeError(f"Download {region} fehlgeschlagen")


def run(circles, regions, keep_pbf=False):
    t_all = time.time()
    todo = [r for r in regions
            if not all(os.path.exists(os.path.join(PARTS, f"{r.split('/')[-1]}.{L}.jsonl.gz"))
                       for L in ["rail", "major"] + [n for n, _ in circles])]
    print(f"{len(regions)} Regionen, offen {len(todo)}", flush=True)
    ready = {}; cv = threading.Condition(); err = []
    RESERVE = 1.3e9

    def downloader():
        try:
            for r in todo:
                size = remote_size(BASE + r + "-latest.osm.pbf") or 1e9
                with cv:
                    while free_bytes() < size + RESERVE and ready:
                        cv.wait(10)
                if free_bytes() < size + 0.4e9:
                    raise RuntimeError(f"zu wenig Platz für {r}: frei {free_bytes() / 1e9:.1f} GB, nötig {size / 1e9:.1f} GB")
                fn = download(r)
                with cv:
                    ready[r] = fn; cv.notify_all()
        except Exception as e:
            err.append(e)
            with cv: cv.notify_all()

    th = threading.Thread(target=downloader, daemon=True); th.start()
    for r in todo:
        with cv:
            while r not in ready and not err:
                cv.wait(5)
            if r not in ready: raise SystemExit(f"Abbruch: {err[0]}")
            fn = ready[r]
        extract(fn, r.split("/")[-1], circles)
        if not keep_pbf:
            os.remove(fn)
        with cv:
            del ready[r]; cv.notify_all()
        print(f"  frei {free_bytes() / 1e9:.2f} GB, bisher {time.time() - t_all:.0f} s", flush=True)
    th.join()
    merge(circles, regions)
    print(f"gesamt {time.time() - t_all:.0f} s", flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    circles = parse_circles(a)
    if not a or a[0] == "run":
        run(circles, REGIONS, keep_pbf="--keep" in a)
    elif a[0] == "extract":
        extract(a[1], a[2], circles)
    elif a[0] == "merge":
        merge(circles, REGIONS)
