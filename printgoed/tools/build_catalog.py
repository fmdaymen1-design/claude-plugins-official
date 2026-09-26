#!/usr/bin/env python3
"""Build js/catalog-data.js from an Etsy listings export (and optional reviews export).

Usage:
    python3 tools/build_catalog.py EtsyListingsDownload.csv [reviews.json] [--out js/catalog-data.js]

Download the files in Etsy: Shop Manager -> Settings -> Options -> Download Data.
Run this again whenever you add or change listings.
"""
import argparse
import csv
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Order matters: first match wins.
CATEGORY_RULES = [
    ("digital", r"digital|download|instant"),
    ("hoodies", r"hoodie|sweatshirt|crewneck|sweater"),
    ("tshirts", r"t-?shirt|\btee\b|shirt"),
    ("ornaments", r"ornament"),
    ("accessories", r"phone|iphone|case|\bhat\b|\bcap\b|tote|bag"),
    ("digital", r"printable|spreadsheet|planner|tracker|wallpaper|background|clipart|\bpng\b|\bsvg\b|\bpdf"),
    ("home", r"pillow|cushion|puzzle|mug|tumbler|candle|canvas|print|poster|napkin|mat\b|blanket|decor"),
]

THEME_RULES = [
    ("halloween", r"halloween|spooky|witch|skeleton|pumpkin|ghost"),
    ("christmas", r"christmas|xmas|santa|holiday|hanukkah|chrismukkah|festive|winter"),
    ("family", r"\bmom\b|mama|mother|\bdad\b|daddy|father|grandma|grandpa|family|baby"),
    ("pets", r"\bdog\b|\bcat\b|puppy|kitten|terrier|retriever|beagle|husky|pet\b|animal"),
    ("sports", r"football|basketball|baseball|soccer|hockey|sports|game day|ski|snowboard"),
    ("funny", r"funny|humor|sarcastic|joke|quirky|satirical"),
]


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def clean_desc(text, limit=700):
    text = html.unescape(text or "").replace("\r", "")
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    # Keep the story; the long spec sheet stays on Etsy.
    text = re.split(r"\n\s*(?:Product Features|Features|Specifications|Product Details|Care Instructions)\b", text, maxsplit=1)[0].strip()
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "…"
    return text


def classify(rules, haystack, default=None, multi=False):
    hits = [key for key, pattern in rules if re.search(pattern, haystack, re.I)]
    if multi:
        return hits
    return hits[0] if hits else default


def variation(row, wanted):
    for n in (1, 2, 3):
        name = (row.get(f"VARIATION {n} NAME") or "").strip()
        if name.lower() in wanted:
            values = [v.strip() for v in (row.get(f"VARIATION {n} VALUES") or "").split(",") if v.strip()]
            return name, values
    return None, []


def build_products(csv_path):
    products, seen = [], set()
    with open(csv_path, encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            title = html.unescape(row["TITLE"]).strip()
            if not title:
                continue
            tags = [t.replace("_", " ") for t in (row.get("TAGS") or "").split(",") if t]
            haystack = title + " " + " ".join(tags)
            images = [row[f"IMAGE{i}"] for i in range(1, 11) if row.get(f"IMAGE{i}")][:6]
            if not images:
                continue
            pid = slug(title)
            n = 2
            while pid in seen:
                pid = f"{slug(title)}-{n}"
                n += 1
            seen.add(pid)
            size_name, sizes = variation(row, {"size", "phone model", "model"})
            color_name, colors = variation(row, {"color", "colour", "shape", "surface"})
            products.append({
                "id": pid,
                "t": title,
                "d": clean_desc(row.get("DESCRIPTION")),
                "p": round(float(row.get("PRICE") or 0), 2),
                "c": classify(CATEGORY_RULES, title, "home"),
                "th": classify(THEME_RULES, haystack, multi=True),
                "img": images,
                "sn": size_name, "s": sizes,
                "cn": color_name, "co": colors,
                # Optional: add a URL or LISTING_ID column to the CSV to link straight to the listing.
                "u": (row.get("URL") or "").strip() or (
                    f"https://www.etsy.com/listing/{row['LISTING_ID'].strip()}" if (row.get("LISTING_ID") or "").strip() else ""),
            })
    return products


def build_reviews(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    # Only keep what the site shows; order IDs stay out of the public files.
    return [{
        "n": r.get("reviewer", "").strip() or "Etsy buyer",
        "dt": r.get("date_reviewed", ""),
        "r": int(r.get("star_rating") or 0),
        "m": html.unescape(r.get("message", "")).replace("\r", "").strip(),
    } for r in data if (r.get("message") or "").strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("reviews", nargs="?")
    ap.add_argument("--out", default=str(ROOT / "js" / "catalog-data.js"))
    args = ap.parse_args()

    products = build_products(args.csv)
    reviews = build_reviews(args.reviews) if args.reviews else []
    out = Path(args.out)
    out.write_text(
        "// Generated by tools/build_catalog.py. Do not edit by hand.\n"
        f"window.PG_PRODUCTS = {json.dumps(products, ensure_ascii=False, separators=(',', ':'))};\n"
        f"window.PG_REVIEWS = {json.dumps(reviews, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    counts = {}
    for p in products:
        counts[p["c"]] = counts.get(p["c"], 0) + 1
    print(f"Wrote {len(products)} products and {len(reviews)} reviews to {out}")
    print("Per category:", counts)


if __name__ == "__main__":
    main()
