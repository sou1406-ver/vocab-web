"""Rebuild WORD FAMILIES tables from OCR word boxes (3 columns: pos | word | sentence)."""
import json
import re
import sys
from collections import defaultdict

src, out = sys.argv[1], sys.argv[2]
pages = {}
cur = None
for raw in open(src, encoding="utf-8-sig"):
    raw = raw.rstrip("\n")
    m = re.match(r"=====PAGE p(\d+)=====", raw)
    if m:
        cur = int(m.group(1)); pages[cur] = defaultdict(list); continue
    if not raw.strip():
        continue
    li, x, y, w, t = raw.split("\t", 4)
    pages[cur][int(li)].append((int(x), int(y), int(w), t))

POSW = {"verb", "noun", "adjective", "adverb"}
result = {}
for pno, lines in pages.items():
    # Column x positions differ per page: find word column and sentence column starts
    starts = sorted(min(ws)[0] for ws in lines.values())
    wordcol = min([x for x in starts if 250 <= x < 500] or [300])
    sentcol = min([x for x in starts if x > wordcol + 150] or [wordcol + 230])
    POS_X, SENT_X = wordcol - 40, sentcol - 20
    # Split each OCR line by column (OCR sometimes merges word + sentence into one line)
    items = []
    for li, ws in lines.items():
        ws.sort()
        for lo, hi in ((0, POS_X), (POS_X, SENT_X), (SENT_X, 10 ** 6)):
            part = [a for a in ws if lo <= a[0] < hi]
            if part:
                items.append((min(a[1] for a in part), part[0][0], " ".join(a[3] for a in part)))
    # header y: skip everything above "WORD FAMILIES" baseline
    hdr = [y for y, x, t in items if "FAMILIES" in t]
    y0 = hdr[0] + 40 if hdr else 0
    items = [it for it in items if it[0] > y0]
    # drop page-footer page numbers
    items = [it for it in items if not re.fullmatch(r"\d+", it[2])]

    pos_items = sorted([it for it in items if it[1] < POS_X and re.sub(r"^[Il|]\s*", "", it[2]).lower() in POSW])
    word_items = sorted([it for it in items if POS_X <= it[1] < SENT_X])
    sent_items = sorted([it for it in items if it[1] >= SENT_X])
    rows = []
    for (py, px, pt) in pos_items:
        rows.append({"y": py, "pos": re.sub(r"^[Il|]\s*", "", pt).lower(), "word": "", "sent": []})
    # Words: nearest row by y
    def nearest(y):
        return min(rows, key=lambda r: abs(r["y"] - y)) if rows else None
    for (wy, wx, wt) in word_items:
        r = nearest(wy)
        if r and abs(r["y"] - wy) < 30:
            r["word"] = (r["word"] + " " + wt).strip()
        else:
            # word column text that is actually part of a sentence (rare wrap) -> treat as sentence
            sent_items.append((wy, wx, wt))
    sent_items.sort()
    # Sentences: row whose y is closest at or above (lines wrap downward)
    for (sy, sx, st) in sent_items:
        cands = [r for r in rows if r["y"] - 25 <= sy]
        r = max(cands, key=lambda r: r["y"]) if cands else (rows[0] if rows else None)
        if r:
            r["sent"].append(st)
    for r in rows:
        r["sent"] = re.sub(r"\s+", " ", " ".join(r["sent"])).strip()
        del r["y"]
    result[pno] = rows

json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for p, rows in sorted(result.items()):
    bad = [r for r in rows if not r["word"] or not r["sent"]]
    print(p, len(rows), "BAD:" + str(bad) if bad else "")
