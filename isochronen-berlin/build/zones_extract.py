"""Extract from a Geofabrik PBF: building footprints (area + centroid), landuse polygons, admin boundaries.
Usage: python -I -u zones_extract.py <pbf> <outprefix>
Writes <outprefix>.bld.npz (lon, lat, area_m2), <outprefix>.lu.pkl (list of (kind, wkb)),
<outprefix>.adm.pkl (list of dict(name, level, ags, wkb)).
"""
import math, pickle, sys, time
import numpy as np
import osmium, osmium.geom

BBOX = (12.85, 52.25, 13.95, 52.75)   # buildings / landuse only inside this box
LU_KEEP = {"residential", "commercial", "retail", "industrial", "construction", "railway"}
LEIS_KEEP = {"park", "garden", "playground", "pitch", "sports_centre", "golf_course", "cemetery"}
LU_OPEN = {"cemetery", "grass", "meadow", "forest", "allotments", "recreation_ground", "farmland"}
ADM_LEVELS = {"4", "6", "7", "8", "9", "10"}

wkbf = osmium.geom.WKBFactory()


class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.blon = []; self.blat = []; self.barea = []
        self.lu = []; self.adm = []
        self.n = 0

    def area(self, a):
        t = a.tags
        b = t.get("building")
        lu = t.get("landuse"); le = t.get("leisure")
        isadm = t.get("boundary") == "administrative" and t.get("admin_level") in ADM_LEVELS and not a.from_way()
        if not (b or lu or le or isadm):
            return
        if isadm:
            try:
                w = wkbf.create_multipolygon(a)
            except Exception:
                return
            self.adm.append(dict(name=t.get("name"), level=t.get("admin_level"),
                                 ags=t.get("de:amtlicher_gemeindeschluessel"), rid=a.orig_id(), wkb=w))
            return
        # quick bbox test with first outer ring's first node
        try:
            ring = next(iter(a.outer_rings()))
            loc = ring[0].location
            lo, la = loc.lon, loc.lat
        except Exception:
            return
        if not (BBOX[0] <= lo <= BBOX[2] and BBOX[1] <= la <= BBOX[3]):
            return
        if b and b != "no":
            # planar area in local equirectangular metres (shoelace), centroid ~ mean of outer ring vertices
            kx = 111320.0 * math.cos(math.radians(la)); ky = 110540.0
            tot = 0.0; sx = sy = 0.0; nn = 0
            for oi, outer in enumerate(a.outer_rings()):
                xs = [n.location.lon for n in outer]; ys = [n.location.lat for n in outer]
                s = 0.0
                for i in range(len(xs) - 1):
                    s += (xs[i] - lo) * (ys[i + 1] - la) - (xs[i + 1] - lo) * (ys[i] - la)
                tot += abs(s) / 2 * kx * ky
                sx += sum(xs); sy += sum(ys); nn += len(xs)
                for inner in a.inner_rings(outer):
                    xs = [n.location.lon for n in inner]; ys = [n.location.lat for n in inner]
                    s = 0.0
                    for i in range(len(xs) - 1):
                        s += (xs[i] - lo) * (ys[i + 1] - la) - (xs[i + 1] - lo) * (ys[i] - la)
                    tot -= abs(s) / 2 * kx * ky
            if nn and 0 < tot < 2e6:
                self.blon.append(sx / nn); self.blat.append(sy / nn); self.barea.append(tot)
            self.n += 1
            if self.n % 200000 == 0:
                print(f"  {self.n} buildings", flush=True)
            return
        kind = None
        if lu in LU_KEEP or lu in LU_OPEN:
            kind = "lu:" + lu
        elif le in LEIS_KEEP:
            kind = "le:" + le
        if kind:
            try:
                self.lu.append((kind, wkbf.create_multipolygon(a)))
            except Exception:
                pass


def main():
    pbf, out = sys.argv[1], sys.argv[2]
    t0 = time.time()
    h = H()
    flt = [osmium.filter.KeyFilter("building", "landuse", "leisure", "boundary")]
    try:
        h.apply_file(pbf, locations=True, filters=flt)
    except TypeError:
        h.apply_file(pbf, locations=True)
    np.savez_compressed(out + ".bld.npz", lon=np.array(h.blon), lat=np.array(h.blat), area=np.array(h.barea))
    pickle.dump(h.lu, open(out + ".lu.pkl", "wb"))
    pickle.dump(h.adm, open(out + ".adm.pkl", "wb"))
    print(f"{pbf}: {len(h.barea)} buildings ({sum(h.barea)/1e6:.1f} km2), {len(h.lu)} landuse, {len(h.adm)} admin; {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
