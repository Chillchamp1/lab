"""Valhalla-Expansionen (Auto, Rad, Fuß, schnelles Radnetz) für einen Startpunkt.
Aufruf: python fetch_valhalla.py hbf 52.5251 13.3694   -> data/hbf/exp_{car,bike,walk,net}.json
Server: FOSSGIS-Valhalla (valhalla1.openstreetmap.de), bitte sparsam benutzen."""
import json, os, sys, time, requests
name, LAT, LON = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", name); os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "isochrone-demo/1.0 (one-off precompute)", "Accept-Encoding": "gzip"}
MODES = {
    "car": {"costing": "auto", "costing_options": {"auto": {}}},
    "bike": {"costing": "bicycle", "costing_options": {"bicycle": {"bicycle_type": "Hybrid", "cycling_speed": 17, "avoid_bad_surfaces": 0.05, "use_roads": 0.4, "use_hills": 0.5}}},
    "walk": {"costing": "pedestrian", "costing_options": {"pedestrian": {"walking_speed": 5.0, "max_hiking_difficulty": 3, "walkway_factor": 1.0}}},
    "net": {"costing": "bicycle", "costing_options": {"bicycle": {"bicycle_type": "Hybrid", "cycling_speed": 35, "avoid_bad_surfaces": 0.0, "use_roads": 0.5}}},
}
for mode, cfg in MODES.items():
    fn = os.path.join(OUT, f"exp_{mode}.json")
    if os.path.exists(fn): continue
    body = dict(cfg, locations=[{"lat": LAT, "lon": LON}], action="isochrone", contours=[{"time": 60}],
                skip_opposites=True, dedupe=True, expansion_properties=["duration", "edge_status"])
    for attempt in range(4):
        r = requests.post("https://valhalla1.openstreetmap.de/expansion", json=body, headers=UA, timeout=600)
        if r.status_code == 200: break
        print(mode, r.status_code, r.text[:200], flush=True); time.sleep(20)
    r.raise_for_status()
    open(fn, "wb").write(r.content)
    print(name, mode, len(r.content) // 1024, "KB", flush=True)
    time.sleep(3)
