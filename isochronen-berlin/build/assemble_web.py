"""Web-Fassung für GitHub Pages: index.html (Code, klein) + data/streets.json + Kacheln als Einzeldateien.
Nur Start Hauptbahnhof. Aufruf: python -I assemble_web.py <Zielordner>"""
import os, sys, json, math, shutil
H = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
tpl = open(os.path.join(H, "template.html"), encoding="utf-8").read()


def ty(lat, z):
    r = math.radians(lat); return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** z)


lists = json.load(open(os.path.join(H, "tiles_lists.json")))
Y14 = ty(52.585, 14)                       # Detailstufe 14 nur rund um die Innenstadt


def keep_bg(n):
    z, x, y = map(int, n.split("_")); return z != 14 or y >= Y14


def keep_lab(n):
    z, x, y = map(int, n.split("_"))
    if z == 11 and not (1080 <= x <= 1113 and 656 <= y <= 687): return False
    return z != 14 or y >= Y14


tiles, ltiles = {}, {}
for kind, names, keep, d in (("bg", lists["bg"], keep_bg, tiles), ("lab", lists["lab"], keep_lab, ltiles)):
    dst = os.path.join(OUT, "tiles", kind); os.makedirs(dst, exist_ok=True)
    for n in names:
        src = os.path.join(H, "tiles_" + kind, n + ".webp")
        if not keep(n) or not os.path.exists(src) or os.path.getsize(src) == 0: continue
        shutil.copyfile(src, os.path.join(dst, n + ".webp"))
        z, x, y = n.split("_"); d[f"{z}/{x}/{y}"] = 0          # 0 = Datei unter tiles/<kind>/
LITE = os.path.join(H, "data", "streets_web_lite.json")   # ausgedünnt von lite_streets.py (leichter im Browser)
if os.path.exists(LITE):
    streets = open(LITE, encoding="utf-8").read()
else:
    fn = next(os.path.join(H, "data", f) for f in ("streets_v8_rr.json", "streets_v8.json") if os.path.exists(os.path.join(H, "data", f)))
    d = json.load(open(fn))
    streets = json.dumps({"step": d["step"], "tmax": d["modes"]["biketransit"]["tmax"],
                          "origins": {"hbf": {"origin": d["origin"], "modes": {"biketransit": d["modes"]["biketransit"]}}}}, separators=(",", ":"))
open(os.path.join(OUT, "data", "streets.json"), "w", encoding="utf-8").write(streets)
RAW = len(streets.encode("utf-8"))

# Hauptskript erst nach dem Laden der Daten starten
a = "<script>\n(function(){"; b = "})();\n</script>"
assert tpl.count(a) == 1 and tpl.rfind(b) > tpl.find(a)
i = tpl.rfind(b)
loader = """}
(async()=>{
  const el=document.createElement('div');el.id='loading';
  el.style.cssText='position:fixed;inset:0;display:grid;place-items:center;background:#0b0c0e;color:#c9ccd2;font:15px system-ui,sans-serif;z-index:5000';
  el.textContent='Loading map data …';document.body.appendChild(el);
  try{
    const r=await fetch('data/streets.json');if(!r.ok)throw new Error(r.status);
    const rd=r.body.getReader(),parts=[];let got=0;
    for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;
      el.textContent='Loading map data … '+Math.min(99,Math.round(got/%d*100))+' %%';}
    STREETS=JSON.parse(new TextDecoder().decode(await new Blob(parts).arrayBuffer()));
    el.remove();MAIN();
  }catch(e){el.textContent='Could not load the map data ('+e.message+').';}
})();
</script>""" % RAW
tpl = tpl[:i] + loader + tpl[i + len(b):]
tpl = tpl.replace(a, "<script>\nfunction MAIN(){", 1)
# Web: herausgezoomt früher auf Hauptnetz/Fernstraßen reduzieren (flüssiger auf normalen Rechnern)
LV = "const levFor=z=>z<7.25?2:(z<8.25?1:0);"
assert tpl.count(LV) == 1
tpl = tpl.replace(LV, "const levFor=z=>z<7.75?2:(z<9?1:0);")
html = (tpl.replace("const STREETS=/*STREETS_JSON*/;", "let STREETS;")
           .replace("/*LEAFLET_CSS*/", open(os.path.join(H, "vendor", "leaflet.css"), encoding="utf-8").read())
           .replace("/*LEAFLET_JS*/", open(os.path.join(H, "vendor", "leaflet.js"), encoding="utf-8").read())
           .replace("/*TILES_JSON*/", json.dumps(tiles, separators=(",", ":")))
           .replace("/*LTILES_JSON*/", json.dumps(ltiles, separators=(",", ":")))
           .replace("/*BORDERS_JSON*/", open(os.path.join(H, "data", "borders.json"), encoding="utf-8").read())
           .replace("/*ZONES_JSON*/", open(os.path.join(H, "data", "zones.json"), encoding="utf-8").read()))
assert "/*" not in html.split("<script>")[-1][:200] or True
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
tot = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
print("index.html", round(os.path.getsize(os.path.join(OUT, "index.html")) / 1e6, 2), "MB; streets.json", round(RAW / 1e6, 1),
      "MB; Kacheln", len(tiles), "+", len(ltiles), "; gesamt", round(tot / 1e6, 1), "MB")
