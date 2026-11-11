"""Gerade 2-Punkt-Linienabschnitte (S-Bahn, U-Bahn, Regional, Fernverkehr) auf OSM-Gleise legen.

Aufruf:  python -I reroute_hops.py data/hbf/streets_raw.json data/hbf/streets_rr.json [--rail QUELLE]
QUELLE: Overpass-artige JSON-Datei oder Kachelverzeichnis; Standard data/osm_rail_de.json, sonst data/rail_tiles.
Ersetzt in jedem Modus unter "modes" mit "hops" jeden 2-Punkt-Hop der Modi 1/2/4/7 durch die geroutete
Gleisgeometrie (erster/letzter Punkt bleiben exakt die Stationspunkte). Reihenfolge, t0/t1/mode unverändert.
"""
import collections, json, math, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hopcodec import decode_hops, encode_hops
from railgraph import RailGraph

RAIL_MODES = {1, 2, 4, 7}
NAMES = {1: "S", 2: "U", 4: "RE", 7: "FV"}


def main(fin, fout, rail=None):
    t0 = time.time()
    d = json.load(open(fin))
    LAT, LON = d["origin"]
    decoded = {m: decode_hops(v["hops"]) for m, v in d["modes"].items() if v.get("hops")}
    # benötigter Kachelbereich aus allen Hop-Punkten (+0.3°)
    allq = np.vstack([h[3] for hs in decoded.values() for h in hs])
    la = LAT + allq[:, 1] * 1e-5; lo = LON + allq[:, 0] * 1e-5
    g = RailGraph(source=rail, bbox=(la.min() - .3, la.max() + .3, lo.min() - .3, lo.max() + .3))
    for m, hops in decoded.items():
        st = collections.Counter(); fails = collections.Counter(); ratios = []
        out = []
        for t0_, t1_, md, q in hops:
            st["total"] += 1
            if md in RAIL_MODES and len(q) == 2:
                st["straight"] += 1
                (qa, qb) = q
                lonA, latA = LON + qa[0] * 1e-5, LAT + qa[1] * 1e-5
                lonB, latB = LON + qb[0] * 1e-5, LAT + qb[1] * 1e-5
                xy = g.route(lonA, latA, lonB, latB, md)
                if xy is not None:
                    qi = np.c_[np.round((xy[1:-1, 0] - LON) * 1e5), np.round((xy[1:-1, 1] - LAT) * 1e5)].astype(np.int64)
                    nq = np.vstack([qa, qi, qb])
                    keep = np.r_[True, np.any(np.diff(nq, axis=0) != 0, axis=1)]
                    keep[-1] = True
                    nq = nq[keep]
                    if len(nq) > 2:
                        q = nq; st["rerouted"] += 1; st[f"rerouted_{NAMES[md]}"] += 1
                        if g.last_straight and g.last_straight > 0:
                            ratios.append(g.last_len / g.last_straight)
                    else:   # Gleis verläuft (nach 6-m-Vereinfachung) gerade -> Hop bleibt korrekt 2-punktig
                        st["track_is_straight"] += 1
                else:
                    fails[g.last_reason] += 1; st[f"failed_{NAMES[md]}"] += 1
            out.append((t0_, t1_, md, q))
        d["modes"][m]["hops"] = encode_hops(out)
        st["failed"] = sum(fails.values())
        r = np.array(ratios) if ratios else np.array([np.nan])
        print(f"[{m}] Hops {st['total']}, gerade Schienen-Hops {st['straight']}, umgelegt {st['rerouted']}, "
              f"Gleis gerade (bleibt 2 Punkte) {st['track_is_straight']}, fehlgeschlagen {st['failed']} {dict(fails)}", flush=True)
        print(f"    je Modus: " + ", ".join(f"{k}={v}" for k, v in sorted(st.items()) if k[:7] in ("reroute", "failed_"))
              + f" | Längenverhältnis Gleis/Luftlinie: median {np.nanmedian(r):.3f}, max {np.nanmax(r):.3f}", flush=True)
    tmp = fout + ".tmp"
    with open(tmp, "w") as f:
        json.dump(d, f, separators=(",", ":"))
    os.replace(tmp, fout)
    print(f"geschrieben {fout} ({os.path.getsize(fout) / 1e6:.1f} MB) in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    args = sys.argv[1:]; rail = None
    if "--rail" in args:
        i = args.index("--rail"); rail = args[i + 1]; del args[i:i + 2]
    if len(args) != 2:
        sys.exit(__doc__)
    main(args[0], args[1], rail)
