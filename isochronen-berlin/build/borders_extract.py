"""Extract national (admin_level=2) boundary relations + member way geometries of Germany's relation
from Geofabrik state extracts, one at a time (download -> MD5 check -> extract -> delete).

Usage: python -I -u borders_extract.py [region ...]     (default: all REGIONS)
Output: borders_parts/<region>.json  {"rels": {rid: {name, iso, ways:[wid..]}}, "ways": {wid: {tags, c:[[lon,lat],..]}}}
Only ways that are members of the Germany relation (51477) are stored.
"""
import hashlib, json, os, shutil, subprocess, sys, time
import osmium

H = os.path.dirname(os.path.abspath(__file__))
PBF_DIR = os.path.join(H, "borders_pbf")     # downloads only
PARTS = os.path.join(H, "borders_parts")
UA = "isochrone-demo/1.0"
BASE = "https://download.geofabrik.de/europe/germany/"
# smaller Geofabrik sub-region extracts where they suffice (low disk / memory on this machine)
REGIONS = ["saarland", "schleswig-holstein", "mecklenburg-vorpommern", "brandenburg", "sachsen", "rheinland-pfalz",
           "bayern/oberpfalz", "bayern/oberfranken", "bayern/niederbayern", "bayern/oberbayern",
           "baden-wuerttemberg/karlsruhe-regbez", "baden-wuerttemberg/freiburg-regbez",
           "nordrhein-westfalen/muenster-regbez", "niedersachsen"]
DE_REL = 51477


def md5_of(fn):
    h = hashlib.md5()
    with open(fn, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""): h.update(b)
    return h.hexdigest()


def download(region):
    os.makedirs(PBF_DIR, exist_ok=True)
    name = region.split("/")[-1] + "-latest.osm.pbf"
    url = BASE + region + "-latest.osm.pbf"; fn = os.path.join(PBF_DIR, name)
    r = subprocess.run(["curl", "-sIL", "-A", UA, url], capture_output=True, text=True)
    size = max([int(l.split(":")[1]) for l in r.stdout.splitlines() if l.lower().startswith("content-length:")] or [0])
    free = shutil.disk_usage(H).free
    if free < size + 300e6: raise RuntimeError(f"not enough disk for {region}: free {free/1e9:.2f} GB, need {size/1e9:.2f} GB")
    r = subprocess.run(["curl", "-sfL", "-A", UA, url + ".md5"], capture_output=True, text=True)
    want = r.stdout.split()[0] if r.returncode == 0 and r.stdout else None
    if not want: raise RuntimeError(f"no MD5 for {region}")
    for attempt in range(4):
        t0 = time.time()
        subprocess.run(["curl", "-sSL", "--retry", "5", "--retry-delay", "10", "-C", "-", "-A", UA, "-o", fn, url])
        if md5_of(fn) == want:
            print(f"  downloaded {name}: {os.path.getsize(fn)/1e6:.0f} MB in {time.time()-t0:.0f} s, MD5 ok", flush=True)
            return fn
        print(f"  MD5 mismatch for {name}, retry", flush=True)
        os.remove(fn)
    raise RuntimeError(f"download {region} failed")


class RelH(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.rels = {}

    def relation(self, r):
        t = r.tags
        if t.get("boundary") == "administrative" and t.get("admin_level") == "2":
            self.rels[r.id] = dict(name=t.get("name:en") or t.get("name"), iso=t.get("ISO3166-1"),
                                   ways=[m.ref for m in r.members if m.type == "w"])


class WayH(osmium.SimpleHandler):
    def __init__(self, ids):
        super().__init__(); self.ids = ids; self.ways = {}

    def way(self, w):
        if w.id in self.ids:
            self.ways[w.id] = dict(tags={k: v for k, v in w.tags}, nodes=[n.ref for n in w.nodes])


class NodeH(osmium.SimpleHandler):
    def __init__(self, ids):
        super().__init__(); self.ids = ids; self.loc = {}

    def node(self, n):
        if n.id in self.ids:
            self.loc[n.id] = (round(n.location.lon, 6), round(n.location.lat, 6))


def extract(fn, region):
    t0 = time.time()
    rh = RelH()
    rh.apply_file(fn, locations=False, filters=[osmium.filter.EntityFilter(osmium.osm.RELATION)])
    de = rh.rels.get(DE_REL)
    if not de: raise RuntimeError("Germany relation not in extract")
    ids = set(de["ways"])
    wh = WayH(ids)    # 3 passes without a node-location index (memory is tight here)
    wh.apply_file(fn, locations=False, filters=[osmium.filter.EntityFilter(osmium.osm.WAY)])
    nh = NodeH({n for w in wh.ways.values() for n in w["nodes"]})
    nh.apply_file(fn, locations=False, filters=[osmium.filter.EntityFilter(osmium.osm.NODE)])
    for w in wh.ways.values():
        nodes = w.pop("nodes")
        w["c"] = [list(nh.loc[n]) for n in nodes if n in nh.loc]
        if len(w["c"]) < len(nodes): print(f"  warning: way missing {len(nodes)-len(w['c'])} nodes", flush=True)
    os.makedirs(PARTS, exist_ok=True)
    json.dump(dict(rels=rh.rels, ways=wh.ways), open(os.path.join(PARTS, region.split("/")[-1] + ".json"), "w"))
    print(f"  {region}: {len(rh.rels)} admin2 rels, {len(wh.ways)}/{len(ids)} DE member ways present, "
          f"{time.time()-t0:.0f} s", flush=True)


if __name__ == "__main__":
    regs = sys.argv[1:] or REGIONS
    for r in regs:
        if os.path.exists(os.path.join(PARTS, r.split("/")[-1] + ".json")):
            print(f"skip {r}"); continue
        try:
            fn = download(r)
        except Exception as e:
            print(f"  FAILED {r}: {e}", flush=True); continue
        try:
            extract(fn, r)
        except Exception as e:
            print(f"  FAILED {r}: {type(e).__name__}: {e}", flush=True)
        finally:
            import gc; gc.collect()
            try: os.remove(fn)
            except OSError as e: print(f"  could not delete {fn}: {e}", flush=True)
