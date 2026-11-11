"""Rebuild z8-z11 of tiles_bg/ and tiles_lab/ for the extended area (tiles_regions_lowzoom.json); run after tiles_split.py.

bg z11     : bg8 render crops
bg z10/9/8 : box 2x downscale chain of unlifted backgrounds (missing children -> base colour),
             mild contrast lift once per level (tiles_lib.lift, LIFT_K)
lab z8-11  : lab8 render crops, trimmed like trim_lab.py, lossless WebP, transparent tiles skipped
z12-z14 tiles in both folders are left untouched.
"""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image

W = os.path.dirname(os.path.abspath(__file__)) + "/"
spec = importlib.util.spec_from_file_location("lz", W + "tiles_lib.py")
lz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lz)

REN = W + "renders/"
BG = W + "tiles_bg/"
LAB = W + "tiles_lab/"
T = 512
BG_OPTS = dict(quality=74, method=6)
LAB_OPTS = dict(lossless=True, quality=75, method=4)
LOW = ("8", "9", "10", "11")

reg_low = json.load(open(W + "tiles_regions_lowzoom.json"))
RANGES = {int(z): v for z, v in reg_low["ranges"].items()}


def rng(z):
    x0, x1, y0, y1 = RANGES[z]
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def trim(c):
    a = c.copy()
    al = a[..., 3].astype(int)
    al[al < 14] = 0
    al = np.where(al < 250, (al // 4) * 4, 255)
    a[..., 3] = al
    a[al == 0, :3] = 0
    return a


def main():
    for i in range(len(reg_low["bg11"])):
        assert os.path.exists(REN + f"bg8_{i}.png"), i
    for i in range(len(reg_low["labels"])):
        assert os.path.exists(REN + f"lab8_{i}.png"), i
    # coverage check
    for z in (8, 9, 10, 11):
        ts = {(x, y) for r in reg_low["labels"] if r[0] == z for x in range(r[1], r[3] + 1) for y in range(r[2], r[4] + 1)}
        assert ts == set(rng(z)), ("label coverage", z)
    ts = {(x, y) for r in reg_low["bg11"] for x in range(r[1], r[3] + 1) for y in range(r[2], r[4] + 1)}
    assert ts == set(rng(11)), "bg11 coverage"

    counts_bg, counts_lab, empty_lab = {}, {}, {}
    bg_only = "--bg-only" in sys.argv

    # ---------------- labels
    lab_written = None
    if bg_only:
        print("bg-only: label tiles untouched")
    n_del = 0 if not bg_only else None
    for f in (os.listdir(LAB) if not bg_only else []):
        if f.split("_")[0] in LOW:
            os.remove(LAB + f)
            n_del += 1
    print("deleted old z8-z11 label tiles:", n_del)
    lab_written = set() if not bg_only else None
    for i, r in enumerate(reg_low["labels"] if not bg_only else []):
        z = r[0]
        for x, y, c in lz.crops(REN + f"lab8_{i}.png", r, "RGBA"):
            a = trim(c)
            if a[..., 3].max() == 0:
                empty_lab[z] = empty_lab.get(z, 0) + 1
                continue
            name = f"{z}_{x}_{y}"
            Image.fromarray(a, "RGBA").save(LAB + name + ".webp", "WEBP", **LAB_OPTS)
            lab_written.add(name)
            counts_lab[z] = counts_lab.get(z, 0) + 1
        print(f"lab8_{i} done", file=sys.stderr)
    print("label tiles:", dict(sorted(counts_lab.items())), "skipped empty:", dict(sorted(empty_lab.items())))

    # ---------------- backgrounds
    bg_written = set()

    def save_bg(u8, z, x, y):
        name = f"{z}_{x}_{y}"
        Image.fromarray(u8, "RGB").save(BG + name + ".webp", "WEBP", **BG_OPTS)
        bg_written.add(name)
        counts_bg[z] = counts_bg.get(z, 0) + 1

    fill = np.broadcast_to(lz.BASE, (T, T, 3))
    z10_set = set(rng(10))
    pending = {}  # z11 (x,y) -> uint8 tile, kept until its z10 parent is complete
    bg10 = {}

    def make_parent(px, py, allow_missing):
        kids = [(2 * px + dx, 2 * py + dy) for dy in (0, 1) for dx in (0, 1)]
        have = [k in pending for k in kids]
        if not all(have) and not allow_missing:
            return False
        big = np.empty((1024, 1024, 3), np.float32)
        for (kx, ky) in kids:
            k = pending.get((kx, ky))
            big[(ky - 2 * py) * T:(ky - 2 * py + 1) * T, (kx - 2 * px) * T:(kx - 2 * px + 1) * T] = fill if k is None else k
        bg10[(px, py)] = lz.down2(big)
        return True

    z11_set = set(rng(11))
    n_margin = 0
    for i, r in enumerate(reg_low["bg11"]):
        assert r[0] == 11
        parents = set()
        z, x0, y0, x1, y1 = r
        im = Image.open(REN + f"bg8_{i}.png").convert("RGB")
        assert im.size == lz.img_size(r)
        a = np.asarray(im)
        # include the 1-tile render margin: margin tiles outside the z11 range are used
        # only as downscaling input for z10-z8 (never written as z11 tiles)
        for x in range(x0 - 1, x1 + 2):
            for y in range(y0 - 1, y1 + 2):
                l = (lz.M + (x - x0) * 256) * lz.PR
                t = (lz.M + (y - y0) * 256) * lz.PR
                c = np.ascontiguousarray(a[t:t + T, l:l + T])
                if (x, y) in z11_set:
                    if x0 <= x <= x1 and y0 <= y <= y1:
                        save_bg(c, 11, x, y)
                        pending[(x, y)] = c
                        parents.add((x // 2, y // 2))
                elif (x, y) not in pending and (x // 2, y // 2) in z10_set:
                    pending[(x, y)] = c
                    n_margin += 1
                    parents.add((x // 2, y // 2))
        for (px, py) in parents:
            if (px, py) in z10_set and (px, py) not in bg10 and make_parent(px, py, False):
                for dy in (0, 1):
                    for dx in (0, 1):
                        pending.pop((2 * px + dx, 2 * py + dy), None)
        print(f"bg8_{i} done, pending {len(pending)}", file=sys.stderr)
    miss = 0
    for (px, py) in z10_set:
        if (px, py) not in bg10:
            make_parent(px, py, True)
            miss += 1
    print("margin z11 tiles used for downscaling:", n_margin)
    print("z10 parents with missing z11 children (filled):", miss)
    pending.clear()

    raw = {10: bg10}
    for z in (10, 9, 8):
        if z < 10:
            child, cur, miss = raw[z + 1], {}, 0
            for (x, y) in rng(z):
                big = np.empty((1024, 1024, 3), np.float32)
                for dy in (0, 1):
                    for dx in (0, 1):
                        k = child.get((2 * x + dx, 2 * y + dy))
                        if k is None:
                            miss += 1
                        big[dy * T:(dy + 1) * T, dx * T:(dx + 1) * T] = fill if k is None else k
                cur[(x, y)] = lz.down2(big)
            raw[z] = cur
            print(f"z{z}: {miss} missing child tiles filled")
        for (x, y) in rng(z):
            save_bg(lz.to_u8(lz.lift(raw[z][(x, y)], lz.LIFT_K[z])), z, x, y)
        raw.pop(z + 2, None)

    # remove stale z8-z11 bg tiles outside the new ranges (none expected)
    stale = [f for f in os.listdir(BG) if f.split("_")[0] in LOW and f[:-5] not in bg_written]
    print("stale z8-z11 bg tiles outside new ranges:", len(stale))

    # ---------------- lists
    def zkey(s):
        return tuple(int(v) for v in s.split("_"))
    lp = W + "tiles_lists.json"
    lists = json.load(open(lp))
    for key, new in (("bg", bg_written), ("lab", lab_written)):
        if new is None:
            continue
        old_hi = [s for s in lists[key] if s.split("_")[0] not in LOW]
        lists[key] = sorted(set(old_hi) | new, key=zkey)
    with open(lp, "w") as f:
        json.dump(lists, f)

    def mb(d):
        return sum(os.path.getsize(d + f) for f in os.listdir(d)) / 1e6

    def per_zoom(d):
        out = {}
        for f in os.listdir(d):
            z = int(f.split("_")[0])
            out[z] = out.get(z, 0) + 1
        return dict(sorted(out.items()))
    print("bg written:", dict(sorted(counts_bg.items())))
    if not bg_only:
        print("lab written:", dict(sorted(counts_lab.items())))
    print("tiles_bg per zoom:", per_zoom(BG), f"{mb(BG):.1f} MB")
    print("tiles_lab per zoom:", per_zoom(LAB), f"{mb(LAB):.1f} MB")
    print("lists:", {k: len(v) for k, v in lists.items()})


if __name__ == "__main__":
    main()
