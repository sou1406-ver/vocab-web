"""Tạo phiên âm IPA (Anh-Mỹ) cho mọi từ trong dữ liệu, dựa trên CMU Pronouncing Dictionary.

Chạy:  python tools/make_ipa.py      (cần mạng lần đầu để tải cmudict)
Kết quả: data/source/ipa.json  →  tools/build_data.py tự đọc khi build.
"""

import glob
import json
import os
import re
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CMU_URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"
CMU_CACHE = os.path.join(ROOT, "tools", ".cache", "cmudict.dict")

ARPA = {
    "AA": "ɑ",
    "AE": "æ",
    "AH": "ʌ",
    "AO": "ɔ",
    "AW": "aʊ",
    "AY": "aɪ",
    "EH": "ɛ",
    "ER": "ɝ",
    "EY": "eɪ",
    "IH": "ɪ",
    "IY": "i",
    "OW": "oʊ",
    "OY": "ɔɪ",
    "UH": "ʊ",
    "UW": "u",
    "B": "b",
    "CH": "tʃ",
    "D": "d",
    "DH": "ð",
    "F": "f",
    "G": "ɡ",
    "HH": "h",
    "JH": "dʒ",
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ŋ",
    "P": "p",
    "R": "r",
    "S": "s",
    "SH": "ʃ",
    "T": "t",
    "TH": "θ",
    "V": "v",
    "W": "w",
    "Y": "j",
    "Z": "z",
    "ZH": "ʒ",
}
VOWELS = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}
# Phụ âm đầu hợp lệ trong tiếng Anh (để đặt dấu nhấn đúng chỗ đầu âm tiết)
ONSETS = {
    tuple(o.split())
    for o in """
P R|P L|B R|B L|T R|D R|K R|K L|G R|G L|F R|F L|TH R|SH R|S P|S T|S K|S M|S N|S L|S W|S P R|S P L|S T R|S K R|S K W|
T W|D W|K W|G W|P Y|B Y|K Y|F Y|M Y|V Y|HH Y|S K Y""".replace("\n", "").split("|")
    if o.strip()
}


def load_cmu():
    if not os.path.exists(CMU_CACHE):
        os.makedirs(os.path.dirname(CMU_CACHE), exist_ok=True)
        print("Đang tải CMU Pronouncing Dictionary…")
        urllib.request.urlretrieve(CMU_URL, CMU_CACHE)
    cmu = {}
    for line in open(CMU_CACHE, encoding="utf-8"):
        line = line.split("#")[0].strip()
        if not line:
            continue
        head, *phones = line.split()
        word = re.sub(r"\(\d+\)$", "", head)
        cmu.setdefault(word, []).append(phones)
    return cmu


def to_ipa(phones):
    """ARPAbet → IPA, đặt dấu nhấn ˈ / ˌ trước phụ âm đầu của âm tiết."""
    syms = []  # (ipa, is_vowel, stress, arpa)
    for p in phones:
        m = re.match(r"([A-Z]+)(\d)?", p)
        base, stress = m.group(1), m.group(2)
        if base in VOWELS:
            ipa = ARPA[base]
            if stress == "0":
                ipa = {"AH": "ə", "ER": "ɚ"}.get(base, ipa)
            syms.append([ipa, True, stress, base])
        else:
            syms.append([ARPA[base], False, None, base])
    out = [s[0] for s in syms]
    vowel_idx = [i for i, s in enumerate(syms) if s[1]]
    marks = {}
    for k, vi in enumerate(vowel_idx):
        st = syms[vi][2]
        if st not in ("1", "2") or (len(vowel_idx) == 1):
            continue
        prev_v = vowel_idx[k - 1] if k > 0 else -1
        cons = list(range(prev_v + 1, vi))
        start = vi
        # lấy cụm phụ âm dài nhất là phụ âm đầu hợp lệ
        for n in range(len(cons), 0, -1):
            cl = tuple(syms[i][3] for i in cons[-n:])
            if n == 1 or cl in ONSETS:
                start = cons[-n]
                break
        if k == 0:
            start = 0
        marks[start] = "ˈ" if st == "1" else "ˌ"
    res = "".join((marks.get(i, "") + s) for i, s in enumerate(out))
    return res


def first_stress(phones):
    """Trọng âm chính có rơi vào nguyên âm đầu tiên không."""
    for p in phones:
        if p[:-1] in VOWELS:
            return p[-1] == "1"
    return True


def pick(variants, pos):
    """Chọn cách đọc theo từ loại: danh/tính từ nhấn âm đầu, động từ nhấn âm sau (record, present, project…)."""
    if len(variants) == 1:
        return variants[0]
    # Đuôi -ate: động từ đọc /-eɪt/, danh/tính từ đọc /-ət/ (estimate, duplicate, separate…)
    full_ate = [v for v in variants if v[-2:] in (["EY1", "T"], ["EY2", "T"])]
    weak_ate = [v for v in variants if v[-2:] in (["AH0", "T"], ["IH0", "T"])]
    if full_ate and weak_ate:
        return (full_ate if pos == "v" else weak_ate)[0]
    stress_first = [v for v in variants if first_stress(v)]
    stress_later = [v for v in variants if not first_stress(v)]
    if stress_first and stress_later:
        return (stress_later if pos == "v" else stress_first)[0]
    return variants[0]


# Sửa tay vài trường hợp từ điển chọn sai nghĩa
OVERRIDES = {"lead time": "/ˈlid ˌtaɪm/", "mix-up": "/ˈmɪks ˌʌp/"}


PREFIX_IPA = {"un": "ʌn", "in": "ɪn", "im": "ɪm", "dis": "dɪs", "mis": "mɪs", "re": "ri"}
SUFFIX_IPA = [
    ("ability", "əˈbɪləti"),
    ("ness", "nəs"),
    ("ly", "li"),
    ("able", "əbəl"),
    ("ible", "əbəl"),
    ("ful", "fəl"),
    ("er", "ɚ"),
    ("or", "ɚ"),
    ("al", "əl"),
]


def compose(w, pos, cmu, depth=0):
    """Từ không có trong CMU: ghép từ gốc + phiên âm tiền tố / hậu tố (promptness = prompt + -ness)."""
    if depth > 2:
        return None

    def lookup(x):
        if x in cmu:
            return to_ipa(pick(cmu[x], pos)).strip("/")
        return compose(x, pos, cmu, depth + 1)

    for suf, sipa in SUFFIX_IPA:
        if w.endswith(suf) and len(w) > len(suf) + 2:
            stem = w[: -len(suf)]
            for base in (
                stem,
                stem + "e",
                stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else None,
                stem[:-1] + "y" if stem.endswith("i") else None,
            ):
                if base and (b := lookup(base)):
                    if sipa.startswith("ə") and "ˈ" in sipa:  # -ability kéo trọng âm
                        b = b.replace("ˈ", "ˌ")
                    if "ˈ" not in b and "ˈ" not in sipa:  # gốc 1 âm tiết: nhấn vào gốc
                        b = "ˈ" + b
                    return b + sipa
    for pre, pipa in PREFIX_IPA.items():
        if w.startswith(pre) and len(w) > len(pre) + 3:
            b = lookup(w[len(pre) :])
            if b:
                return pipa + b
    return None


def ipa_for(word, pos, cmu):
    if word.lower().strip() in OVERRIDES:
        return OVERRIDES[word.lower().strip()]
    parts = re.split(r"[\s]+", word.lower().strip())
    out = []
    for w in parts:
        w = w.replace("’", "'")
        cands = [w, w.replace("-", "")]
        found = None
        for c in cands:
            if c in cmu:
                found = to_ipa(pick(cmu[c], pos))
                break
        if not found:
            found = compose(w, pos, cmu)
        if not found and "-" in w:  # từ ghép có gạch nối: ghép từng phần
            sub = [ipa_for(x, pos, cmu) for x in w.split("-")]
            if all(sub):
                found = "-".join(s.strip("/") for s in sub)
        if not found:
            return None
        out.append(found.strip("/"))
    return "/" + " ".join(out) + "/"


def main():
    cmu = load_cmu()
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    words = {}  # (word, pos)
    book = json.load(open(os.path.join(ROOT, "data/source/book.json"), encoding="utf-8"))
    for l in book:
        for e in l["entries"]:
            pos = (re.match(r"^(v|n|adj|adv)\.", e["def"]) or [None, ""])[1]
            words[(e["word"], pos)] = None
    for path in glob.glob(os.path.join(ROOT, "data/enrich/*.txt")):
        for raw in open(path, encoding="utf-8"):
            if raw.startswith("  ") and "|" in raw:
                c = [x.strip() for x in raw.split("|")]
                words[(c[0], c[1])] = None
            elif raw.strip() and not raw.startswith("#") and "|" in raw:
                words.setdefault((raw.split("|")[0].strip(), ""), None)
    # từ đồng nghĩa / trái nghĩa ngoài sách (data/relations.txt) — mục ghép "a; b" lấy phần đầu
    rel = os.path.join(ROOT, "data/relations.txt")
    if os.path.exists(rel):
        for raw in open(rel, encoding="utf-8"):
            if " | " in raw and not raw.startswith("#"):
                words.setdefault((raw.split(" | ")[0].split(";")[0].strip(), ""), None)
    ipa, missing = {}, []
    for w, pos in sorted(words):
        r = ipa_for(w, pos, cmu)
        key = f"{w.lower()}|{pos}"
        if r:
            ipa[key] = r
        else:
            missing.append(w)
    json.dump(
        ipa,
        open(os.path.join(ROOT, "data/source/ipa.json"), "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=0,
        sort_keys=True,
    )
    print(f"{len(ipa)} phiên âm, thiếu {len(set(missing))}: {sorted(set(missing))}")


if __name__ == "__main__":
    main()
