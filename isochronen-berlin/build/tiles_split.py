"""Split tile sets: tiles_bg (backgrounds, no labels, z8-z14) and tiles_lab (label-only RGBA, z8-z14).

bg z11     : bg11 render crops (tiles_regions_base.json "bg11")
bg z10/9/8 : box 2x downscale chain of unlifted backgrounds + mild contrast lift (tiles_lib.py)
bg z12-14  : bg2 render crops (tiles_regions_detail.json "bg2")
lab z8-14  : lab2 render crops (tiles_regions_detail.json "labels2"), fully transparent tiles skipped
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
LAB_PREFIX = os.environ.get("LAB_PREFIX", "lab2")
LAB_OPTS = json.loads(os.environ.get("LAB_OPTS", '{"lossless": true, "quality": 75, "method": 4}'))

reg_base = json.load(open(W + "tiles_regions_base.json"))
reg_detail = json.load(open(W + "tiles_regions_detail.json"))


def tiles_of(r):
    z, x0, y0, x1, y1 = r
    return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def main():
    os.makedirs(BG, exist_ok=True)
    os.makedirs(LAB, exist_ok=True)
    lab_only = "--lab-only" in sys.argv
    if lab_only:  # rebuild label tiles from scratch so no stale tiles remain
        for f in os.listdir(LAB):
            if f.endswith(".webp"):
                os.remove(LAB + f)
    for i in range(len(reg_detail["labels2"])):
        assert os.path.exists(REN + f"{LAB_PREFIX}_{i}.png"), i
    for i in range(len(reg_detail["bg2"]) if not lab_only else 0):
        assert os.path.exists(REN + f"bg2_{i}.png"), i

    bg_written, lab_written = set(), set()
    counts_bg, counts_lab, empty_lab = {}, {}, {}

    def save_bg(arr_u8, z, x, y):
        name = f"{z}_{x}_{y}"
        if name in bg_written:
            return
        Image.fromarray(arr_u8, "RGB").save(BG + name + ".webp", "WEBP", **BG_OPTS)
        bg_written.add(name)
        counts_bg[z] = counts_bg.get(z, 0) + 1

    # ---- labels z8-z14
    lab_tiles = {}
    for i, r in enumerate(reg_detail["labels2"]):
        z = r[0]
        lab_tiles.setdefault(z, set()).update(tiles_of(r))
        for x, y, c in lz.crops(REN + f"{LAB_PREFIX}_{i}.png", r, "RGBA"):
            name = f"{z}_{x}_{y}"
            if name in lab_written:
                continue
            if c[..., 3].max() == 0:
                empty_lab[z] = empty_lab.get(z, 0) + 1
                continue
            Image.fromarray(np.ascontiguousarray(c), "RGBA").save(LAB + name + ".webp", "WEBP", **LAB_OPTS)
            lab_written.add(name)
            counts_lab[z] = counts_lab.get(z, 0) + 1
        print(f"lab2_{i} done", file=sys.stderr)
    print("label tiles written:", dict(sorted(counts_lab.items())), "skipped empty:", dict(sorted(empty_lab.items())))

    def mb(d):
        return sum(os.path.getsize(d + f) for f in os.listdir(d)) / 1e6

    def zkey(s):
        return tuple(int(v) for v in s.split("_"))
    if lab_only:
        lp = W + "tiles_lists.json"
        lists = json.load(open(lp))
        lists["lab"] = sorted(lab_written, key=zkey)
        with open(lp, "w") as f:
            json.dump(lists, f)
        print("lab counts:", dict(sorted(counts_lab.items())), "total", len(lab_written))
        print(f"tiles_lab {mb(LAB):.1f} MB ({len(os.listdir(LAB))} files); bg list kept ({len(lists['bg'])})")
        return

    # ---- bg z12-z14
    for i, r in enumerate(reg_detail["bg2"]):
        for x, y, c in lz.crops(REN + f"bg2_{i}.png", r, "RGB"):
            save_bg(np.ascontiguousarray(c), r[0], x, y)
        print(f"bg2_{i} done", file=sys.stderr)

    # ---- bg z11 + raw z10
    bg10 = {}
    for i, r in enumerate(reg_base["bg11"]):
        tiles = {}
        for x, y, c in lz.crops(REN + f"bg11_{i}.png", r, "RGB"):
            tiles[(x, y)] = c
            save_bg(np.ascontiguousarray(c), 11, x, y)
        for (x, y) in list(tiles):
            px, py = x // 2, y // 2
            kids = [(2 * px + dx, 2 * py + dy) for dy in (0, 1) for dx in (0, 1)]
            if (px, py) in bg10 or not all(k in tiles for k in kids):
                continue
            big = np.empty((1024, 1024, 3), np.float32)
            for (kx, ky) in kids:
                big[(ky - 2 * py) * T:(ky - 2 * py + 1) * T, (kx - 2 * px) * T:(kx - 2 * px + 1) * T] = tiles[(kx, ky)]
            bg10[(px, py)] = lz.down2(big)
        print(f"bg11_{i} done", file=sys.stderr)

    # ---- bg z10, z9, z8 (same tile ranges as the label renders of those zooms)
    fill = np.broadcast_to(lz.BASE, (T, T, 3))
    raw = {10: bg10}
    for z in (10, 9, 8):
        if z < 10:
            child, cur = raw[z + 1], {}
            for (x, y) in lab_tiles[z]:
                big = np.empty((1024, 1024, 3), np.float32)
                for dy in (0, 1):
                    for dx in (0, 1):
                        k = child.get((2 * x + dx, 2 * y + dy))
                        big[dy * T:(dy + 1) * T, dx * T:(dx + 1) * T] = fill if k is None else k
                cur[(x, y)] = lz.down2(big)
            raw[z] = cur
        for (x, y) in sorted(lab_tiles[z]):
            b = raw[z].get((x, y))
            if b is None:
                b = np.array(fill)
            save_bg(lz.to_u8(lz.lift(b, lz.LIFT_K[z])), z, x, y)
        raw.pop(z + 2, None)

    def zkey(s):
        return tuple(int(v) for v in s.split("_"))
    lists = {"bg": sorted(bg_written, key=zkey), "lab": sorted(lab_written, key=zkey)}
    with open(W + "tiles_lists.json", "w") as f:
        json.dump(lists, f)

    def mb(d):
        return sum(os.path.getsize(d + f) for f in os.listdir(d)) / 1e6
    print("bg counts:", dict(sorted(counts_bg.items())), "total", len(bg_written))
    print("lab counts:", dict(sorted(counts_lab.items())), "total", len(lab_written))
    print(f"tiles_bg {mb(BG):.1f} MB ({len(os.listdir(BG))} files), tiles_lab {mb(LAB):.1f} MB ({len(os.listdir(LAB))} files)")


if __name__ == "__main__":
    main()
