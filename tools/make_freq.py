"""Độ phổ biến (thang Zipf) của từ đồng nghĩa / trái nghĩa → data/source/freq.json

Dùng bảng tần suất tiếng Anh của thư viện wordfreq (https://github.com/rspeer/wordfreq, CC BY-SA 4.0):
tải gói wheel vào tools/.cache rồi đọc thẳng file large_en.msgpack.gz (chỉ cần thư viện msgpack).

Thang Zipf: log10(số lần xuất hiện trên 1 tỷ từ). ~7 = "the", 5 = rất phổ biến, 4 = phổ biến, < 3 = hiếm.

Chạy:  python tools/make_freq.py   (cần: pip install msgpack)
"""

import glob
import gzip
import json
import math
import os
import re
import subprocess
import sys
import zipfile

import msgpack

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools/.cache")
OUT = os.path.join(ROOT, "data/source/freq.json")


def load_table():
    whl = glob.glob(os.path.join(CACHE, "wordfreq-*.whl"))
    if not whl:
        os.makedirs(CACHE, exist_ok=True)
        subprocess.run(
            [sys.executable, "-m", "pip", "download", "wordfreq==3.1.1", "--no-deps", "-d", CACHE, "-q"], check=True
        )
        whl = glob.glob(os.path.join(CACHE, "wordfreq-*.whl"))
    with zipfile.ZipFile(whl[0]) as z:
        raw = gzip.decompress(z.read("wordfreq/data/large_en.msgpack.gz"))
    # định dạng cBpack: [header, nhóm 0, nhóm 1, ...]; nhóm i gồm các từ có tần suất 10^(-i/100)
    buckets = msgpack.unpackb(raw, raw=False)[1:]
    table = {}
    for i, words in enumerate(buckets):
        for w in words:
            table.setdefault(w, 10 ** (-i / 100))
    return table


def zipf(table, term):
    """Tần suất của cụm = 1 / tổng(1/tần suất từng từ) (như wordfreq), đổi sang thang Zipf."""
    words = re.findall(r"[a-z]+(?:'[a-z]+)?", term.lower())
    if not words:
        return 0.0
    inv = 0.0
    for w in words:
        f = table.get(w)
        if not f:
            return 0.0
        inv += 1 / f
    return round(math.log10(1 / inv) + 9, 2)


def main():
    table = load_table()
    words = [
        json.loads(line.rstrip(",\n"))
        for line in open(os.path.join(ROOT, "src/data/words.json"), encoding="utf-8")
        if line.startswith("{")
    ]
    terms = set()
    for w in words:
        terms.add(w["word"])
        terms.update(f["w"] for f in w["family"])
        terms.update(w["syn"] + w["ant"])
    out = {}
    for t in sorted(terms, key=str.lower):
        # mục ghép kiểu "accept; confess" lấy phần đầu
        out[t.lower()] = zipf(table, t.split(";")[0])
    json.dump(out, open(OUT, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=0, sort_keys=True)
    vals = sorted(out.values())
    print(f"{len(out)} từ → {os.path.relpath(OUT, ROOT)}; trung vị Zipf {vals[len(vals) // 2]}")


if __name__ == "__main__":
    main()
