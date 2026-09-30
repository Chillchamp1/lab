"""Biome je Zeitscheibe fuer den Schalter "Biomes", nach quellen.py:

    python3 vegetation.py        # -> zwischen/biome.u8, zwischen/biome.json

Dieselbe Rechnung wie im Film (dort prep_veg.py + veg_at), hier je ICE-6G-Zeit-
scheibe der Seite ausgewertet und auf sechs Klassen gerundet:

  Modell   Allen u. a. 2020 (J. Biogeogr. 47, 2073; Zenodo 3966353): LPJ-GUESS,
           Biome auf 0,5 Grad, 0..25 ka je 1 ka, dazu 13kH als Analogon der
           Juengeren Dryas.
  Pollen   Davis u. a. 2024 (Clim. Past 20, 1939) und BIOME 6000 (Harrison 2017)
           korrigieren den Waldanteil im Glazial (das Modell ist dort zu
           bewaldet); Zanon u. a. 2018 (Front. Plant Sci. 9:253) ersetzt ihn
           von 13 bis ~6 ka durch den pollenbasierten Waldanteil.

Je Zelle entsteht eine Farbe mix(Offenland, Wald, Waldanteil); die Seite zeigt
die naechste der sechs Klassenfarben. Das ist eine Vereinfachung fuer die
Legende, keine siebte Rekonstruktion.

Rohdaten unter data/raw/veg/ (siehe DATEN.md). Pakete: numpy, scipy, pandas,
openpyxl, h5py.
"""
import glob
import json
import re
import sys
from pathlib import Path

import h5py
import numpy as np
import pandas as pd
from scipy.ndimage import gaussian_filter, map_coordinates

import quellen as Q

V = Q.ROH / "veg"
ZW = Q.ZWISCHEN
log = lambda s: print(s, file=sys.stderr)
meta = json.loads((ZW / "meta.json").read_text(encoding="utf8"))
g = meta["gitter"]
GW, GH = g["w"], g["h"]
TEILER = 4                                   # Biome sind 0,5-Grad-Daten: 24 km je Zelle reichen

KLASSEN = [  # Kuerzel, Name, sRGB, Waldanteil, Waldklasse?
    ("TU", "Tundra & polar desert", "#a59c88", 0.05, False),
    ("SP", "Steppe & semi-desert", "#cdb557", 0.0, False),
    ("WS", "Forest steppe, open woodland", "#9fb64a", 0.4, False),
    ("NW", "Boreal forest / taiga", "#1d4a38", 1.0, True),
    ("LM", "Deciduous & mixed forest", "#3e8c33", 1.0, True),
    ("ME", "Mediterranean vegetation", "#7fa086", 0.7, True),
]
NK = len(KLASSEN)
TU, SP, WS, NW, LM, ME = range(NK)
ALLEN = {1: TU, 2: TU, 18: TU, 22: TU, 21: SP, 19: SP, 13: SP, 6: SP, 10: WS, 11: WS, 15: WS, 5: WS,
         14: NW, 16: NW, 17: NW, 20: NW, 7: LM, 8: LM, 9: ME, 12: ME, 3: ME, 4: ME}


def lin(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


FARBE = np.array([lin(k[2]) for k in KLASSEN], np.float32)
FWALD = np.array([k[3] for k in KLASSEN], np.float32)
ISWALD = np.array([k[4] for k in KLASSEN])

# Zellmitten der Seite in Laenge/Breite
gx = g["x0"] + (np.arange(GW) + 0.5) * g["schritt"]
gy = g["y1"] - (np.arange(GH) + 0.5) * g["schritt"]
LON, LAT = Q.zurueck(*np.meshgrid(gx, gy))

# ------------------------------------------------------------------ Allen 2020
df = pd.read_csv(V / "Biome_assignments_V1.1_89_time-slices.csv")
LO0, LA0 = -75.0, 25.0
NX, NY = int((110 - LO0) / 0.5), int((89.5 - LA0) / 0.5)
d = df[(df["Lon"] >= LO0) & (df["Lon"] < LO0 + NX * 0.5) & (df["Lat"] >= LA0) & (df["Lat"] < LA0 + NY * 0.5)]
ix = ((d["Lon"].values - LO0) / 0.5).round().astype(int)
iy = ((d["Lat"].values - LA0) / 0.5).round().astype(int)
FX, FY = (LON - LO0 - 0.25) / 0.5, (LAT - LA0 - 0.25) / 0.5
LAT_ZELLE = LA0 + 0.25 + 0.5 * np.arange(NY)[:, None] * np.ones((1, NX))


def scheibe(col):
    codes = np.zeros((NY, NX), np.int16)
    codes[iy, ix] = d[col].values
    k = np.full((NY, NX), -1, np.int16)
    for a, f in ALLEN.items():
        k[codes == a] = f
    k[(codes == 9) & (LAT_ZELLE >= 45.0)] = LM      # TeBEF an der Atlantikkueste: ozeanischer Laubwald
    land = (k >= 0).astype(np.float32)
    den, den_w = gaussian_filter(land, 1.3), gaussian_filter(land, 4.0)
    w = np.zeros((NK, GH, GW), np.float32)
    for c in range(NK):
        one = (k == c).astype(np.float32)
        a = gaussian_filter(one, 1.3) / np.maximum(den, 1e-6)
        b = gaussian_filter(one, 4.0) / np.maximum(den_w, 1e-6)
        w[c] = map_coordinates(np.where(den > 0.05, a, b), [FY, FX], order=1, mode="nearest")
    return w / np.maximum(w.sum(0, keepdims=True), 1e-6)


OFFEN = {NW: lin("#7d8460"), LM: lin("#7a8f52"), ME: lin("#a39c6a")}
ZEIT = [float(t) for t in meta["zeiten"]]
TEMP = meta.get("temperatur") or [None] * len(ZEIT)
ERSTE = next((v for v in TEMP if v is not None), -6.4)


def kaelte_bei(ka):
    """Globale Temperaturanomalie -> 0 (heute) .. 1 (LGM), zwischen den Scheiben linear."""
    t = [v if v is not None else ERSTE for v in TEMP]
    v = float(np.interp(-ka, [-z for z in ZEIT], t))
    return float(np.clip(-v / 7.4, 0, 1))


def felder(w, kalt):
    wf, wo = w * ISWALD[:, None, None], w * (~ISWALD)[:, None, None]
    sf, so = wf.sum(0), wo.sum(0)
    cw = np.einsum("khw,kc->hwc", wf, FARBE) / np.maximum(sf, 1e-6)[..., None]
    co = np.einsum("khw,kc->hwc", wo, FARBE) / np.maximum(so, 1e-6)[..., None]
    wald_fb = np.where((LAT > 57)[..., None], FARBE[NW], np.where((LAT < 41.5)[..., None], FARBE[ME], FARBE[LM]))
    cw = np.where((sf < 1e-3)[..., None], wald_fb, cw)
    warm = sum(w[k][..., None] * OFFEN[k] for k in (NW, LM, ME)) / np.maximum(sf, 1e-6)[..., None]
    warm = np.where((sf < 1e-3)[..., None], FARBE[SP], warm)
    kalt_fb = np.where((LAT > 55)[..., None], FARBE[TU], FARBE[SP])
    co = np.where((so < 1e-3)[..., None], warm * (1 - kalt) + kalt_fb * kalt, co)
    return co, cw, np.einsum("khw,k->hw", w, FWALD)


def main():
    log("Allen 2020, 26 Scheiben + 13kH")
    S = {}
    for k in range(26):
        S[k] = felder(scheibe(f"{k:03d}kDV"), kaelte_bei(k))
    Syd = felder(scheibe("013kHDV"), 0.8)       # Juengere Dryas regional deutlich kaelter als global

    log("Zanon 2018")
    zf = sorted(glob.glob(str(V / "zanon2018" / "**" / "forest_cover_*.grd"), recursive=True),
                key=lambda p: int(re.findall(r"_(\d+)\.grd", p)[0]))
    z_ka, z_fc = [], []
    for p in zf:
        with h5py.File(p, "r") as f:
            lo, la, z = f["lon"][:], f["lat"][:], f["z"][:].astype(np.float32)
        fx, fy = (LON - lo[0]) / (lo[1] - lo[0]), (LAT - la[0]) / (la[1] - la[0])
        v = map_coordinates(np.nan_to_num(z), [fy, fx], order=1, mode="constant", cval=0)
        m = map_coordinates(np.isfinite(z).astype(np.float32), [fy, fx], order=1, mode="constant", cval=0)
        z_ka.append(int(re.findall(r"_(\d+)\.grd", p)[0]) / 1000.0)
        z_fc.append(np.where(m > 0.5, v / np.maximum(m, 1e-6), np.nan))
    z_ka = np.array(z_ka)
    gueltig = np.isfinite(z_fc[-1]).astype(np.float32)
    feder = np.clip((gaussian_filter(gueltig, 150 / g["schritt"]) - 0.5) * 2, 0, 1) * gueltig

    log("Pollenkorrektur Glazial (Davis 2024, BIOME 6000)")
    dv = pd.read_excel(next(V.rglob("Davis et al 2024*Figure data*.xlsx")), sheet_name="Figure Data")
    b6 = pd.read_csv(V / "BIOME6000_classified_plotfile_v1.csv", encoding="latin-1")
    MEGA = {"tundra": TU, "grassland and dry shrubland": SP, "desert": SP, "boreal forest": NW,
            "temperate forest": LM, "warm-temperate forest": ME, "savanna and dry woodland": WS, "tropical forest": ME}
    pts = [(r["Latitude"], r["Longitude"], float(np.clip(r["MAT Forest >5m %"] / 70.0, 0, 1)))
           for _, r in dv.iterrows() if np.isfinite(r["MAT Forest >5m %"])]
    pts += [(r["Latitude"], r["Longitude"], float(FWALD[MEGA[str(r["MegaBiomes (Scheme 2)"]).strip()]]))
            for _, r in b6[b6["Target age (ka)"] == 21].iterrows() if str(r["MegaBiomes (Scheme 2)"]).strip() in MEGA]
    la_r, lo_r = np.radians(LAT), np.radians(LON)
    num = np.zeros((GH, GW)); den = np.zeros((GH, GW))
    for a, b, fv in pts:
        a, b = np.radians(a), np.radians(b)
        dkm = Q.ERDR * np.arccos(np.clip(np.sin(la_r) * np.sin(a) + np.cos(la_r) * np.cos(a) * np.cos(lo_r - b), -1, 1))
        w = np.exp(-(dkm / 250.0) ** 2)
        num += w * fv; den += w
    F_pol, conf = num / np.maximum(den, 1e-9), 1 - np.exp(-den / 0.6)
    gxs, gys = [], []
    for a, b, _ in pts:
        x, y = Q.vor(np.array(b), np.array(a))
        gxs.append((float(x) - g["x0"]) / g["schritt"]); gys.append((g["y1"] - float(y)) / g["schritt"])
    gxs, gys = np.array(gxs), np.array(gys)
    ok = (gxs >= 0) & (gxs < GW) & (gys >= 0) & (gys < GH)
    F21 = S[21][2]
    k_fehler = float(np.clip(np.array([p[2] for p in pts])[ok].mean()
                             / max(F21[gys[ok].astype(int), gxs[ok].astype(int)].mean(), 1e-6), 0.2, 1.0))
    log(f"  {int(ok.sum())} Standorte, Faktor fuer standortferne Gebiete k = {k_fehler:.2f}")

    s = lambda t: float(np.clip(t, 0, 1)) ** 2 * (3 - 2 * float(np.clip(t, 0, 1)))

    def farbe(ka):
        ka = float(np.clip(ka, 0, 25))
        k0 = int(np.floor(ka)); k1 = min(25, k0 + 1); t = ka - k0
        co, cw, F = [(1 - t) * x + t * y for x, y in zip(S[k0], S[k1])]
        # Gewichte wie im Film (eiszeit_core.veg_gewichte), Stand 30.09.2026
        yd = s((12.9 - ka) / 0.5 + 0.5) * s((ka - 11.7) / 0.5 + 0.5) * 0.5
        gl = s((ka - 14.5) / 2.0)
        zn = s((13.4 - ka) / 0.5) if ka > 12.9 else (s((ka - 5.5) / 1.5) if ka < 7.0 else 1.0)
        if yd > 0:
            co, cw, F = [(1 - yd) * x + yd * z for x, z in zip((co, cw, F), Syd)]
        if gl > 0:
            F = (1 - gl) * F + gl * (conf * F_pol + (1 - conf) * F * k_fehler)
        if zn > 0:
            j = int(np.clip(np.searchsorted(z_ka, ka), 1, len(z_ka) - 1))
            u = float(np.clip((ka - z_ka[j - 1]) / (z_ka[j] - z_ka[j - 1]), 0, 1))
            fc = (1 - u) * z_fc[j - 1] + u * z_fc[j]
            okz = np.isfinite(fc)
            wz = zn * feder
            F = np.where(okz, (1 - wz) * F + wz * np.clip(np.nan_to_num(fc) / 70.0, 0, 1), F)
        F = np.clip(F, 0, 1)[..., None]
        return co * (1 - F) + cw * F

    # Naechste Klassenfarbe in OKLab (wahrnehmungsnah), auf das grobe Gitter gemittelt
    def oklab(c):
        M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566],
                       [0.0883024619, 0.2817188376, 0.6299787005]])
        M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099],
                       [0.0259040371, 0.7827717662, -0.8086757660]])
        return np.cbrt(np.maximum(c @ M1.T, 0)) @ M2.T

    KL = oklab(FARBE)
    w4, h4 = GW // TEILER, GH // TEILER
    aus = np.zeros((len(ZEIT), h4, w4), np.uint8)
    for i, ka in enumerate(ZEIT):
        c = farbe(ka)[:h4 * TEILER, :w4 * TEILER].reshape(h4, TEILER, w4, TEILER, 3).mean((1, 3))
        dist = ((oklab(c)[:, :, None, :] - KL[None, None]) ** 2).sum(-1)
        aus[i] = dist.argmin(-1)
    aus.tofile(ZW / "biome.u8")
    (ZW / "biome.json").write_text(json.dumps(dict(
        w=w4, h=h4, teiler=TEILER,
        klassen=[dict(kurz=k[0], name=k[1], hex=k[2]) for k in KLASSEN])), encoding="utf8")
    for i in (0, len(ZEIT) // 2, len(ZEIT) - 1):
        n = np.bincount(aus[i].ravel(), minlength=NK)
        log(f"  {ZEIT[i]:>4} ka: " + ", ".join(f"{KLASSEN[k][0]} {100 * n[k] / n.sum():.0f}%" for k in range(NK)))
    log(f"geschrieben: biome.u8 ({len(ZEIT)} x {h4} x {w4})")


if __name__ == "__main__":
    main()
