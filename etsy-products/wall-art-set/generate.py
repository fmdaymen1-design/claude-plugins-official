"""Mid-Century Boho wall art set (6 prints) + Etsy mockups.

Usage: python3 generate.py          full-resolution print files + mockups
       python3 generate.py --quick  mockups only
"""
import math
import os
import random
import sys
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")

CREAM = "#F1E6D6"
TERRA = "#C4683F"
RUST = "#9E4528"
MUSTARD = "#D9A441"
SAGE = "#8E9B7A"
BLUSH = "#E6B49C"
FOREST = "#3F4F45"
INK = "#2E3438"

# name: (width px, height px) at 300 dpi unless noted
RATIOS = {
    "2x3": (4800, 7200),    # 4x6, 8x12, 12x18, 16x24, 24x36 in
    "3x4": (5400, 7200),    # 6x8, 9x12, 12x16, 18x24 in
    "4x5": (4800, 6000),    # 4x5, 8x10, 16x20 in
    "11x14": (3300, 4200),  # 11x14 in
    "ISO-A": (4961, 7016),  # A5, A4, A3, A2  (50x70 cm via A-ratio)
}


# ---------------------------------------------------------------- helpers
def texture(img, amount=7, seed=1):
    """Soft paper grain (low-frequency, compresses well)."""
    w, h = img.size
    rng = np.random.default_rng(seed)
    small = Image.fromarray((rng.random((h // 6, w // 6)) * 255).astype("uint8"))
    noise = np.asarray(small.resize((w, h), Image.BICUBIC), dtype=np.float32) / 255 - 0.5
    arr = np.asarray(img, dtype=np.float32)
    arr += noise[..., None] * amount * 2
    return Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))


def hills(d, W, H, base, amp, freq, phase, color):
    pts = [(x, base + amp * math.sin(freq * x / W * 2 * math.pi + phase)) for x in range(0, W + 20, 20)]
    d.polygon(pts + [(W, H), (0, H)], fill=color)


def blob(d, cx, cy, R, seed, color):
    rnd = random.Random(seed)
    a, b = rnd.uniform(0, 6), rnd.uniform(0, 6)
    pts = []
    for i in range(360):
        t = math.radians(i)
        r = R * (1 + 0.10 * math.sin(3 * t + a) + 0.05 * math.sin(5 * t + b))
        pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    d.polygon(pts, fill=color)


# ---------------------------------------------------------------- artworks
def art_arches(W, H):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    cx, base = W / 2, H * 0.70
    cols = [TERRA, CREAM, MUSTARD, CREAM, SAGE, CREAM, BLUSH]
    R, step = W * 0.36, W * 0.052
    for i, c in enumerate(cols):
        r = R - i * step
        d.pieslice([cx - r, base - r, cx + r, base + r], 180, 360, fill=c)
    d.ellipse([W * 0.70, H * 0.17, W * 0.82, H * 0.17 + W * 0.12], fill=RUST)
    d.rectangle([W * 0.10, base, W * 0.90, base + W * 0.006], fill=INK)
    return im


def art_sunset(W, H):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    r = W * 0.26
    cx, cy = W / 2, H * 0.44
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TERRA)
    hills(d, W, H, H * 0.56, W * 0.035, 1.2, 0.5, MUSTARD)
    hills(d, W, H, H * 0.64, W * 0.045, 0.9, 2.0, SAGE)
    hills(d, W, H, H * 0.74, W * 0.04, 1.4, 4.0, FOREST)
    hills(d, W, H, H * 0.84, W * 0.03, 1.1, 1.0, RUST)
    return im


def art_grid(W, H):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    rnd = random.Random(7)
    palette = [TERRA, MUSTARD, SAGE, BLUSH, FOREST, RUST, CREAM]
    m = W * 0.14
    cols, rows = 3, 4
    cell = (W - 2 * m) / cols
    top = (H - rows * cell) / 2
    for r in range(rows):
        for c in range(cols):
            x, y = m + c * cell, top + r * cell
            bg, fg = rnd.sample(palette, 2)
            d.rectangle([x, y, x + cell, y + cell], fill=bg)
            kind = rnd.randint(0, 2)
            if kind == 0:  # quarter circle
                corner = rnd.randint(0, 3)
                ox = x if corner in (0, 3) else x + cell
                oy = y if corner in (0, 1) else y + cell
                d.ellipse([ox - cell, oy - cell, ox + cell, oy + cell], fill=fg)
                im.paste(bg, [int(x - cell), int(y - cell), int(x), int(y + 2 * cell)]) if False else None
            elif kind == 1:  # half circle
                d.pieslice([x, y + cell / 2 - cell / 2, x + cell, y + cell * 1.5 - cell / 2], 180, 360, fill=fg)
            else:  # circle
                p = cell * 0.18
                d.ellipse([x + p, y + p, x + cell - p, y + cell - p], fill=fg)
        # re-mask overflow of quarter circles by redrawing margins
    d.rectangle([0, 0, W, top], fill=CREAM)
    d.rectangle([0, top + rows * cell, W, H], fill=CREAM)
    d.rectangle([0, 0, m, H], fill=CREAM)
    d.rectangle([W - m, 0, W, H], fill=CREAM)
    return im


def art_grid_clean(W, H):
    """Grid where every cell is clipped to itself."""
    im = Image.new("RGB", (W, H), CREAM)
    rnd = random.Random(11)
    palette = [TERRA, MUSTARD, SAGE, BLUSH, FOREST, RUST, CREAM]
    m = W * 0.14
    cols, rows = 3, 4
    cell = int((W - 2 * m) / cols)
    top = int((H - rows * cell) / 2)
    for r in range(rows):
        for c in range(cols):
            bg = rnd.choice([c for c in palette if c != CREAM])
            fg = rnd.choice([c for c in palette if c != bg])
            tile = Image.new("RGB", (cell, cell), bg)
            td = ImageDraw.Draw(tile)
            kind = (r * cols + c + rnd.randint(0, 2)) % 3
            if kind == 0:
                ox, oy = rnd.choice([(0, 0), (cell, 0), (0, cell), (cell, cell)])
                td.ellipse([ox - cell, oy - cell, ox + cell, oy + cell], fill=fg)
            elif kind == 1:
                oy = rnd.choice([0, cell])
                td.ellipse([0, oy - cell / 2, cell, oy + cell / 2], fill=fg)
            else:
                p = cell * 0.18
                td.ellipse([p, p, cell - p, cell - p], fill=fg)
            im.paste(tile, (int(m) + c * cell, top + r * cell))
    return im


def art_blobs(W, H):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    blob(d, W * 0.40, H * 0.38, W * 0.24, 3, BLUSH)
    blob(d, W * 0.62, H * 0.58, W * 0.20, 5, TERRA)
    blob(d, W * 0.38, H * 0.68, W * 0.10, 9, SAGE)
    lw = int(W * 0.006)
    d.arc([W * 0.22, H * 0.22, W * 0.82, H * 0.22 + W * 0.6], 200, 330, fill=INK, width=lw)
    for i in range(5):
        r = W * 0.012
        x, y = W * (0.62 + 0.035 * i), H * 0.84
        d.ellipse([x - r, y - r, x + r, y + r], fill=INK)
    d.ellipse([W * 0.20, H * 0.80, W * 0.26, H * 0.80 + W * 0.06], fill=MUSTARD)
    return im


def art_mountains(W, H):
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    r = W * 0.09
    d.ellipse([W * 0.66 - r, H * 0.28 - r, W * 0.66 + r, H * 0.28 + r], fill=MUSTARD)
    base = H * 0.74
    for px, peak, half, light, dark in [
        (0.34, 0.40, 0.30, TERRA, RUST),
        (0.66, 0.46, 0.28, SAGE, FOREST),
        (0.50, 0.52, 0.26, BLUSH, TERRA),
    ]:
        x, y, h = W * px, H * peak, W * half
        d.polygon([(x - h, base), (x, y), (x, base)], fill=light)
        d.polygon([(x, y), (x + h, base), (x, base)], fill=dark)
    d.rectangle([W * 0.08, base, W * 0.92, base + W * 0.006], fill=INK)
    return im


def art_waves(W, H):
    im = Image.new("RGB", (W, H), CREAM)
    m = W * 0.18
    top, bottom = H * 0.18, H * 0.82
    layer = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(layer)
    cols = [MUSTARD, TERRA, BLUSH, SAGE, FOREST, RUST]
    band = (bottom - top) / 9
    for i in range(12):
        base = top + i * band
        hills(d, W, H, base, band * 0.35, 2.0, i * 0.9, cols[i % len(cols)])
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    aw = W - 2 * m
    md.ellipse([m, top, W - m, top + aw], fill=255)
    md.rectangle([m, top + aw / 2, W - m, bottom], fill=255)
    im.paste(layer, (0, 0), mask)
    return im


ARTWORKS = [
    ("01-rainbow-arches", art_arches),
    ("02-sunset-hills", art_sunset),
    ("03-geometric-grid", art_grid_clean),
    ("04-organic-shapes", art_blobs),
    ("05-mountain-sun", art_mountains),
    ("06-arch-waves", art_waves),
]


def render(fn, W, H, seed):
    return texture(fn(W, H), seed=seed)


# ---------------------------------------------------------------- mockups
def font(sz, bold=True):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", sz)


def framed(art, frame_w, frame_col="#2B2B2B", mat=True):
    w = frame_w
    border = max(6, int(w * 0.035))
    matw = int(w * 0.09) if mat else 0
    inner_w = w - 2 * border - 2 * matw
    inner_h = int(inner_w * art.height / art.width)
    h = inner_h + 2 * border + 2 * matw
    f = Image.new("RGB", (w, h), frame_col)
    ImageDraw.Draw(f).rectangle([border, border, w - border, h - border], fill="#FBFAF7")
    f.paste(art.resize((inner_w, inner_h), Image.LANCZOS), (border + matw, border + matw))
    return f


def hang(scene, frame, x, y, shadow=28):
    sh = Image.new("RGBA", (frame.width + shadow * 4, frame.height + shadow * 4), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([shadow * 2, shadow * 2, shadow * 2 + frame.width, shadow * 2 + frame.height],
                                 fill=(40, 30, 20, 95))
    sh = sh.filter(ImageFilter.GaussianBlur(shadow * 0.7))
    scene.paste(sh, (x - shadow * 2 + shadow // 2, y - shadow * 2 + shadow), sh)
    scene.paste(frame, (x, y))


def room(W, H, wall="#E9DFD1"):
    im = Image.new("RGB", (W, H), wall)
    d = ImageDraw.Draw(im)
    # subtle light gradient on wall
    grad = Image.linear_gradient("L").rotate(90).resize((W, H))
    im = Image.composite(Image.new("RGB", (W, H), "#F3EBDF"), im, grad.point(lambda v: v * 0.6))
    d = ImageDraw.Draw(im)
    floor = int(H * 0.86)
    d.rectangle([0, floor, W, H], fill="#B58E68")
    for x in range(0, W, 260):
        d.line([x, floor, x - 120, H], fill="#A57F5B", width=3)
    d.rectangle([0, floor - 14, W, floor], fill="#F6F1EA")
    return im, floor


def sofa(im, cx, floor, width):
    d = ImageDraw.Draw(im)
    h = int(width * 0.36)
    top = floor - h
    col, dark = "#9AA48C", "#7F8973"
    # shadow
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - width * 0.55, floor - 30, cx + width * 0.55, floor + 40], fill=(0, 0, 0, 70))
    im.paste(sh.filter(ImageFilter.GaussianBlur(25)), (0, 0), sh.filter(ImageFilter.GaussianBlur(25)))
    d.rounded_rectangle([cx - width / 2 + 60, top, cx + width / 2 - 60, top + h * 0.7], 50, fill=dark)
    d.rounded_rectangle([cx - width / 2, top + h * 0.35, cx + width / 2, floor - h * 0.12], 45, fill=col)
    for s in (-1, 1):
        x = cx + s * (width / 2 - 55)
        d.rounded_rectangle([x - 70, top + h * 0.25, x + 70, floor - h * 0.12], 45, fill=dark)
        d.rectangle([x - 10, floor - h * 0.12, x + 10, floor], fill="#5A4636")
    d.rounded_rectangle([cx - width * 0.32, top + h * 0.08, cx - width * 0.12, top + h * 0.52], 30, fill=TERRA)
    d.rounded_rectangle([cx + width * 0.12, top + h * 0.08, cx + width * 0.32, top + h * 0.52], 30, fill=MUSTARD)


def plant(im, x, floor, scale=1.0):
    d = ImageDraw.Draw(im)
    pw, ph = 180 * scale, 220 * scale
    leaves = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaves)
    rnd = random.Random(4)
    for i in range(14):
        ang = rnd.uniform(-70, 70)
        L = rnd.uniform(380, 620) * scale
        leaf = Image.new("RGBA", (int(L), int(L)), (0, 0, 0, 0))
        ImageDraw.Draw(leaf).ellipse([L * 0.4, 0, L * 0.6, L], fill=rnd.choice(["#4F6B4A", "#5E7B55", "#3E5A3C"]))
        leaf = leaf.rotate(ang, expand=True, resample=Image.BICUBIC)
        leaves.paste(leaf, (int(x - leaf.width / 2 + math.sin(math.radians(ang)) * -L * 0.35),
                            int(floor - ph - leaf.height * 0.85)), leaf)
    im.paste(leaves, (0, 0), leaves)
    d.polygon([(x - pw / 2, floor - ph), (x + pw / 2, floor - ph), (x + pw * 0.38, floor), (x - pw * 0.38, floor)],
              fill="#D8CBB8")


def badge(im, text, sub=None):
    d = ImageDraw.Draw(im)
    f1 = font(int(im.width * 0.03))
    f2 = font(int(im.width * 0.018), False)
    tw = max(d.textlength(text, font=f1), d.textlength(sub, font=f2) if sub else 0)
    pad = im.width * 0.02
    h = im.width * 0.05 + (im.width * 0.03 if sub else 0)
    d.rounded_rectangle([pad, pad, pad + tw + pad * 2, pad + h], 30, fill=INK)
    d.text((pad * 2, pad * 1.6), text, font=f1, fill="#FBFAF7")
    if sub:
        d.text((pad * 2, pad * 1.6 + im.width * 0.04), sub, font=f2, fill=BLUSH)


def mockups(previews):
    W, H = 2700, 2025
    os.makedirs(OUT, exist_ok=True)

    # 1. hero: gallery of 3 above sofa
    im, floor = room(W, H)
    fw = 520
    frames = [framed(previews[i], fw) for i in (1, 0, 4)]
    total = sum(f.width for f in frames) + 2 * 90
    x = (W - total) // 2
    for f in frames:
        hang(im, f, x, 330)
        x += f.width + 90
    sofa(im, W // 2, floor, 1500)
    plant(im, 230, floor, 0.8)
    badge(im, "SET OF 6 PRINTS", "Instant download  •  5 ratios  •  up to 24x36\"")
    im.save(os.path.join(OUT, "mockup-1-livingroom.jpg"), quality=92)

    # 2. all six, gallery wall 3x2
    im, floor = room(W, H, "#E3E6DE")
    fw = 430
    fr = [framed(p, fw, "#C9A27A") for p in previews]
    gx = (W - (3 * fw + 2 * 70)) // 2
    for i, f in enumerate(fr):
        hang(im, f, gx + (i % 3) * (fw + 70), 250 + (i // 3) * (f.height + 60), 20)
    im.save(os.path.join(OUT, "mockup-2-all-six.jpg"), quality=92)

    # 3. single large frame, leaning on console
    im, floor = room(W, H, "#EFE4D6")
    d = ImageDraw.Draw(im)
    ctop = floor - 420
    d.rectangle([W * 0.18, ctop, W * 0.82, ctop + 50], fill="#8A6A4D")
    for xx in (W * 0.21, W * 0.79):
        d.rectangle([xx - 15, ctop + 50, xx + 15, floor], fill="#6E533C")
    f = framed(previews[5], 760, "#2B2B2B")
    hang(im, f, int(W * 0.30), ctop - f.height + 10)
    small = framed(previews[3], 420, "#C9A27A")
    hang(im, small, int(W * 0.58), ctop - small.height + 10)
    plant(im, int(W * 0.12), floor, 0.9)
    im.save(os.path.join(OUT, "mockup-3-console.jpg"), quality=92)

    # 4. sizes info
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    d.text((W / 2, 170), "PRINT AT ANY SIZE", font=font(110), fill=INK, anchor="mm")
    d.text((W / 2, 290), "5 high-resolution JPG files per print  •  300 DPI", font=font(52, False), fill=TERRA,
           anchor="mm")
    rows = [("2:3", "4x6  •  8x12  •  12x18  •  16x24  •  24x36 in"),
            ("3:4", "6x8  •  9x12  •  12x16  •  18x24 in"),
            ("4:5", "4x5  •  8x10  •  16x20 in"),
            ("11x14", "11x14 in"),
            ("ISO A", "A5  •  A4  •  A3  •  A2  •  A1  •  50x70 cm")]
    for i, (k, v) in enumerate(rows):
        y = 480 + i * 270
        d.rounded_rectangle([300, y, 2400, y + 210], 40, fill="#FBFAF7")
        d.rounded_rectangle([300, y, 720, y + 210], 40, fill=[TERRA, MUSTARD, SAGE, BLUSH, FOREST][i])
        d.text((510, y + 105), k, font=font(80), fill="#FBFAF7", anchor="mm")
        d.text((790, y + 105), v, font=font(58, False), fill=INK, anchor="lm")
    im.save(os.path.join(OUT, "mockup-4-sizes.jpg"), quality=92)

    # 5. flat lay of all six
    im = Image.new("RGB", (W, H), "#E7DCCB")
    pw = 600
    for i, p in enumerate(previews):
        t = p.resize((pw, int(pw * 1.5)), Image.LANCZOS)
        x = 250 + (i % 3) * (pw + 150)
        y = 80 + (i // 3) * (int(pw * 1.5) + 70) - 0
        if i // 3 == 1:
            y = H - int(pw * 1.5) - 80
        hang(im, t, x, y, 16)
    im.save(os.path.join(OUT, "mockup-5-collection.jpg"), quality=92)


# ---------------------------------------------------------------- main
def main(quick=False):
    os.makedirs(OUT, exist_ok=True)
    previews = [render(fn, 1000, 1500, i) for i, (_, fn) in enumerate(ARTWORKS)]
    mockups(previews)
    if quick:
        return
    for ratio, (W, H) in RATIOS.items():
        zpath = os.path.join(OUT, f"WallArt-Set-of-6-{ratio}.zip")
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_STORED) as z:
            for i, (name, fn) in enumerate(ARTWORKS):
                im = render(fn, W, H, i)
                tmp = os.path.join(OUT, f"_{name}.jpg")
                im.save(tmp, quality=90, dpi=(300, 300), optimize=True)
                z.write(tmp, f"{name}-{ratio}.jpg")
                os.remove(tmp)
        print(ratio, round(os.path.getsize(zpath) / 1e6, 1), "MB")


if __name__ == "__main__":
    main(quick="--quick" in sys.argv)
