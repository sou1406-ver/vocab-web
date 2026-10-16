"""Tách bài tập trong sách (Words in Context, Part 5, Part 6, Word Review) + đáp án → data/source/exercises.json

Đầu vào:
  --ocr    file OCR có toạ độ từng chữ (tools/ocr.ps1 bản xuất toạ độ: dòng | x | y | w | h | chữ)
  --pages  thư mục ảnh trang PNG (200 dpi) để dò đường gạch dưới (chỗ trống)
  --map    expages.json: {bài: {"wic": [trang], "read": [trang]}}
Chỗ trống được xác định bằng cách dò đường kẻ ngang trên ảnh, nên không phụ thuộc OCR đọc được dấu gạch dưới.
"""
import argparse
import json
import os
import re
import sys
from collections import defaultdict

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser()
ap.add_argument("--ocr", required=True)
ap.add_argument("--pages", required=True)
ap.add_argument("--map", required=True)
ap.add_argument("--review-pages", default="")
ap.add_argument("--out", required=True)
ap.add_argument("--crops", default="", help="thư mục lưu ảnh cắt các dòng nghi bị OCR bỏ sót chữ")
ap.add_argument("--crops-ocr", default="", help="kết quả OCR của các ảnh cắt (cùng định dạng --ocr)")
args = ap.parse_args()

# ---------------------------------------------------------------- OCR
PAGES = defaultdict(list)
cur = None
for raw in open(args.ocr, encoding="utf-8-sig"):
    raw = raw.rstrip("\n")
    m = re.match(r"=====PAGE p(\d+)=====", raw)
    if m:
        cur = int(m.group(1)); continue
    if not raw.strip():
        continue
    li, x, y, w, h, t = raw.split("\t", 5)
    PAGES[cur].append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "t": t, "line": int(li)})

FIX = {"’": "'", "‘": "'", "“": '"', "”": '"', "—": "—", "æ": "ce", "Offce": "Office"}


def clean(s):
    for a, b in FIX.items():
        s = s.replace(a, b)
    return s


# ---------------------------------------------------------------- dò đường gạch dưới
def underlines(pno):
    img = Image.open(os.path.join(args.pages, f"p{pno:03d}.png")).convert("L")
    W, H = img.size
    px = img.load()
    runs = []  # (y, x0, x1)
    for y in range(H):
        x = 0
        while x < W:
            if px[x, y] < 120:
                x0 = x
                while x < W and px[x, y] < 120:
                    x += 1
                if x - x0 >= 40:
                    runs.append((y, x0, x))
            else:
                x += 1
    # gộp các hàng liền nhau thành một đoạn kẻ
    segs = []
    for y, x0, x1 in runs:
        for s in segs:
            if y - s["y1"] <= 2 and min(x1, s["x1"]) - max(x0, s["x0"]) > 0.6 * min(x1 - x0, s["x1"] - s["x0"]):
                s["y1"] = y; s["x0"] = min(s["x0"], x0); s["x1"] = max(s["x1"], x1)
                break
        else:
            segs.append({"y0": y, "y1": y, "x0": x0, "x1": x1})
    # gộp các đoạn cùng hàng, cách nhau ít (đường kẻ ngăn cách in đứt quãng)
    merged = [dict(s) for s in segs]
    changed = True
    while changed:  # lặp tới khi ổn định (một lượt có thể bỏ sót các mảnh nối nhau)
        changed = False
        merged.sort(key=lambda s: (s["y1"], s["x0"]))
        out_m = []
        for s in merged:
            m = next((o for o in out_m if abs(o["y1"] - s["y1"]) <= 3 and s["x0"] <= o["x1"] + 45 and s["x1"] >= o["x0"] - 45), None)
            if m:
                m["x0"] = min(m["x0"], s["x0"]); m["x1"] = max(m["x1"], s["x1"]); m["y0"] = min(m["y0"], s["y0"]); m["y1"] = max(m["y1"], s["y1"])
                changed = True
            else:
                out_m.append(s)
        merged = out_m
    # hàng có từ 3 đoạn kẻ trở lên = đường ngăn cách in đứt quãng, không phải chỗ trống
    by_row = defaultdict(list)
    for s in merged:
        by_row[round(s["y1"] / 4)].append(s)
    segs = []
    for s in merged:
        same_row = [o for o in merged if abs(o["y1"] - s["y1"]) <= 3]
        if len(same_row) >= 3 or sum(o["x1"] - o["x0"] for o in same_row) > 700:
            continue
        segs.append(s)
    out = []
    for s in segs:
        thick = s["y1"] - s["y0"] + 1
        width = s["x1"] - s["x0"]
        if thick <= 6 and 40 <= width <= 520:
            out.append({"x": s["x0"], "y": s["y1"], "w": width, "blank": True})
    return out


# ---------------------------------------------------------------- dựng hàng chữ
def is_dash(b, tokens):
    """Gạch ngang dài (—) nằm giữa chiều cao chữ và dính sát chữ bên cạnh; chỗ trống thì nằm ở chân dòng."""
    words = [t for t in tokens if re.search(r"[A-Za-z]{2}", t["t"])]
    mid = lambda t: t["y"] + 0.25 * t["h"] <= b["y"] <= t["y"] + 0.75 * t["h"]
    for t in words:
        # OCR đọc cả "Notice—Casual" thành một chữ: đường kẻ nằm gọn trong chữ, ở giữa chiều cao
        if mid(t) and t["x"] - 2 <= b["x"] and b["x"] + b["w"] <= t["x"] + t["w"] + 2:
            return True
    left = [t for t in words if mid(t) and abs(t["x"] + t["w"] - b["x"]) <= 6]
    right = [t for t in words if mid(t) and abs(b["x"] + b["w"] - t["x"]) <= 6]
    # gạch nối hai chữ, hoặc gạch ngắn dính một bên (vd "rate—" cuối dòng)
    return bool(left and right) or (bool(left or right) and b["w"] < 60)


def build_rows(tokens, blanks, med_h):
    items = [dict(t, yc=t["y"] + t["h"] / 2) for t in tokens]
    blanks = [b for b in blanks if not is_dash(b, tokens)]
    for b in blanks:
        # chữ đè lên đường kẻ (vd số "16" trong Part 6) thì bỏ chữ, giữ chỗ trống
        for t in list(items):
            if not t.get("blank") and t["x"] < b["x"] + b["w"] - 4 and t["x"] + t["w"] > b["x"] + 4 and 0 <= b["y"] - (t["y"] + t["h"]) <= 14:
                if re.fullmatch(r"[_\-\dIlZßO|\.]{1,8}", t["t"]) and re.search(r"[_\dIlZß]", t["t"]):
                    items.remove(t)
                elif re.fullmatch(r"[_\-\dIlZßO|\.]{1,8}([.,;:!?])", t["t"]):
                    t["t"] = t["t"][-1]
        items.append(dict(b, yc=b["y"] - med_h / 2 - 2, t="___"))
    # token chứa dấu gạch dưới là phần OCR đọc nhầm của đường kẻ
    for t in list(items):
        if not t.get("blank") and "_" in t["t"]:
            stripped = re.sub(r"^[_\W\dIlZß]*_[_\W\dIlZß]*", "", t["t"])
            if re.fullmatch(r"[.,;:!?]?", stripped):
                if stripped:
                    t["t"] = stripped
                else:
                    items.remove(t)
    items.sort(key=lambda t: (t["yc"], t["x"]))
    rows = []
    for t in items:
        if rows and abs(t["yc"] - rows[-1]["yc"]) < med_h * 0.7:
            rows[-1]["items"].append(t)
            n = len(rows[-1]["items"])
            rows[-1]["yc"] = (rows[-1]["yc"] * (n - 1) + t["yc"]) / n
        else:
            rows.append({"yc": t["yc"], "items": [t]})
    for r in rows:
        r["items"].sort(key=lambda t: t["x"])
        r["x0"] = r["items"][0]["x"]
        r["x1"] = max(t["x"] + t["w"] for t in r["items"])
    return rows


def med_height(tokens):
    hs = sorted(t["h"] for t in tokens if re.search(r"[a-z]", t["t"]))
    return hs[len(hs) // 2] if hs else 20


def join_rows(rows):
    """Nối các hàng thành đoạn văn, ghép lại từ bị ngắt bằng gạch nối cuối dòng."""
    text = ""
    for r in rows:
        line = " ".join(t["t"] for t in r["items"])
        if text.endswith("-") and re.search(r"[a-z]-$", text) and re.match(r"^[a-z]", line):
            text = text[:-1] + line
        else:
            text = (text + " " + line).strip()
    return clean(re.sub(r"\s+", " ", text))


# ---------------------------------------------------------------- bù chữ OCR bỏ sót ở cuối dòng
CROP_OCR = defaultdict(list)
if args.crops_ocr and os.path.exists(args.crops_ocr):
    cname = None
    for raw in open(args.crops_ocr, encoding="utf-8-sig"):
        raw = raw.rstrip("\n")
        m = re.match(r"=====PAGE (\S+)=====", raw)
        if m:
            cname = m.group(1); continue
        if raw.strip():
            li, x, y, w, h, tx = raw.split("\t", 5)
            CROP_OCR[cname].append({"x": int(x), "y": int(y), "t": tx})
PENDING_CROPS = []
SCALE = 2.5


def fill_line_ends(rows, pno):
    """Đoạn văn căn đều 2 bên: dòng kết thúc sớm (không phải cuối đoạn) gần như chắc chắn bị sót chữ.
    Cắt phần còn lại của dòng, phóng to, OCR lại và chèn chữ vào."""
    if len(rows) < 3:
        return rows
    ends = sorted(r["x1"] for r in rows)
    right = ends[int(len(ends) * 0.8)]
    img = None
    for k, r in enumerate(rows[:-1]):
        last = r["items"][-1]
        if last.get("blank") or r["x1"] > right - 60 or re.search(r"[.?!:\"']$", last["t"]):
            continue
        top = min(t["y"] for t in r["items"] if not t.get("blank")) - 6
        bot = max(t["y"] + t["h"] for t in r["items"] if not t.get("blank")) + 8
        name = f"p{pno:03d}_{int(top)}"
        if name in CROP_OCR:
            extra = sorted(CROP_OCR[name], key=lambda t: t["x"])
            x = r["x1"] + 8
            for e in extra:
                if re.search(r"[A-Za-z]", e["t"]):
                    r["items"].append({"x": x + (e["x"] - 60) / SCALE, "y": top, "w": 10, "h": 10, "t": e["t"], "yc": r["yc"]})
            r["x1"] = right
        elif args.crops:
            if img is None:
                img = Image.open(os.path.join(args.pages, f"p{pno:03d}.png")).convert("L")
            box = (int(r["x1"] + 8), int(top), int(right + 40), int(bot))
            if box[2] - box[0] > 30:
                os.makedirs(args.crops, exist_ok=True)
                c = img.crop(box)
                c = c.resize((int(c.width * SCALE), int(c.height * SCALE)), Image.LANCZOS)
                pad = Image.new("L", (c.width + 120, c.height + 60), 255)  # lề trắng giúp OCR đọc đúng chữ đầu
                pad.paste(c, (60, 30))
                pad.save(os.path.join(args.crops, name + ".png"))
                PENDING_CROPS.append(name)
    return rows


def find_row(rows, pattern):
    for i, r in enumerate(rows):
        if re.search(pattern, " ".join(t["t"] for t in r["items"])):
            return i
    return None


# ---------------------------------------------------------------- Words in Context
def parse_wic(pno):
    toks = PAGES[pno]
    mh = med_height(toks)
    rows = build_rows(toks, underlines(pno), mh)
    i = find_row(rows, r"Read the following")
    if i is None:
        raise ValueError("không thấy dòng hướng dẫn")
    rest = rows[i + 1:]
    # bảng từ: các hàng sát nhau ngay dưới hướng dẫn; đoạn văn bắt đầu sau khoảng cách lớn đầu tiên
    k = 1
    gap0 = rest[1]["yc"] - rest[0]["yc"] if len(rest) > 1 else 0
    while k < len(rest) and rest[k]["yc"] - rest[k - 1]["yc"] < gap0 * 1.4:
        k += 1
    passage = [r for r in rest[k:] if not re.fullmatch(r"\d{1,3}", " ".join(t["t"] for t in r["items"]))]
    passage = fill_line_ends(passage, pno)
    # bỏ nhãn (n) — vị trí chỗ trống lấy từ đường kẻ
    for r in passage:
        r["items"] = [t for t in r["items"] if not re.fullmatch(r"\(?[0-9Il]{1,2}\)?[.,]?", t["t"]) or t.get("blank")]
    # tách đoạn: dòng đầu đoạn thụt vào so với lề trái
    left = sorted(r["x0"] for r in passage)[len(passage) // 4] if passage else 0
    paras, cur = [], []
    for r in passage:
        # sang đoạn mới: dòng thụt vào rõ ràng VÀ dòng trước kết thúc câu
        prev_end = cur[-1]["items"][-1]["t"] if cur else ""
        if cur and r["x0"] > left + 25 and not r["items"][0].get("blank") and re.search(r"[.!?:\"')]$", prev_end):
            paras.append(cur); cur = []
        cur.append(r)
    if cur:
        paras.append(cur)
    text = "\n".join(join_rows(p) for p in paras)
    n = 0

    def num(m):
        nonlocal n
        n += 1
        return f"{{{{{n}}}}}"
    text = re.sub(r"___", num, text)
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    return {"text": text, "blanks": n}


# ---------------------------------------------------------------- câu hỏi trắc nghiệm (Part 5, Word Review)
OPT = re.compile(r"^\(?([A-D])\)$")


def parse_questions(rows, numbers):
    """rows: các hàng của MỘT cột, theo thứ tự đọc. Trả về {số: {text, options}}."""
    qs = {}
    cur = None
    last = None
    for r in rows:
        items = r["items"]
        first = items[0]["t"]
        m = re.fullmatch(r"(\d{1,2})[.,]", first)
        has_words = any(re.search(r"[A-Za-z]{2}", t["t"]) for t in items)
        is_options = any(OPT.match(t["t"]) for t in items)
        if m and int(m.group(1)) in numbers:
            cur = {"n": int(m.group(1)), "sent": [], "opts": {}}
            qs[cur["n"]] = cur
            last = cur["n"]
            items = items[1:]
        elif has_words and not is_options and (cur is None or cur["opts"]):
            # OCR bỏ sót số câu: dòng chữ mới sau phần phương án = câu kế tiếp
            implied = (last + 1) if last is not None else min(numbers)
            if implied in numbers and implied not in qs:
                cur = {"n": implied, "sent": [], "opts": {}}
                qs[implied] = cur
                last = implied
        if cur is None or not items:
            continue
        markers = [i for i, t in enumerate(items) if OPT.match(t["t"])]
        if not markers and cur["opts"]:
            continue  # sau phần phương án: đường kẻ / chú thích, bỏ qua tới câu kế tiếp
        if markers:
            for j, mi in enumerate(markers):
                end = markers[j + 1] if j + 1 < len(markers) else len(items)
                letter = OPT.match(items[mi]["t"]).group(1)
                cur["opts"][letter] = clean(" ".join(t["t"] for t in items[mi + 1:end])).strip(" .")
        else:
            cur["sent"].append({"items": items})
    out = {}
    for n, q in qs.items():
        text = join_rows(q["sent"])
        text = re.sub(r"\s+([.,;:!?])", r"\1", text)
        out[n] = {"text": text, "options": q["opts"]}
    return out


def split_columns(rows_tokens, blanks, mid, mh):
    left = [t for t in rows_tokens if t["x"] + t["w"] / 2 < mid]
    right = [t for t in rows_tokens if t["x"] + t["w"] / 2 >= mid]
    bl = [b for b in blanks if b["x"] + b["w"] / 2 < mid]
    br = [b for b in blanks if b["x"] + b["w"] / 2 >= mid]
    return build_rows(left, bl, mh) + build_rows(right, br, mh)


def page_width(pno):
    return Image.open(os.path.join(args.pages, f"p{pno:03d}.png")).size[0]


def parse_reading(pno):
    toks = PAGES[pno]
    mh = med_height(toks)
    blanks = underlines(pno)
    rows = build_rows(toks, [], mh)
    i5 = find_row(rows, r"Part\s*5")
    i6 = find_row(rows, r"Part\s*6")
    if i5 is None or i6 is None:
        raise ValueError("không thấy Part 5 / Part 6")
    y5, y6 = rows[i5]["yc"], rows[i6]["yc"]
    mid = page_width(pno) / 2
    # Part 5: hai cột
    p5t = [t for t in toks if y5 + mh < t["y"] + t["h"] / 2 < y6 - mh and not re.search(r"Choose the word", t["t"])]
    p5b = [b for b in blanks if y5 < b["y"] < y6 - mh / 2]
    p5rows = split_columns(p5t, p5b, mid, mh)
    p5rows = [r for r in p5rows if not re.match(r"Choose", r["items"][0]["t"])]
    part5 = parse_questions(p5rows, set(range(10, 16)))
    # Part 6: đoạn văn rộng cả trang + các phương án
    p6t = [t for t in toks if t["y"] + t["h"] / 2 > y6 + mh]
    p6b = [b for b in blanks if b["y"] > y6 + mh]
    p6rows = build_rows(p6t, p6b, mh)
    p6rows = [r for r in p6rows if not re.match(r"Choose", r["items"][0]["t"])]
    iopt = next((k for k, r in enumerate(p6rows) if re.fullmatch(r"1[6-8][.,]", r["items"][0]["t"])), None)
    if iopt is None:
        raise ValueError("không thấy phương án Part 6")
    passage_rows = fill_line_ends(p6rows[:iopt], pno)
    left_margin = min(r["x0"] for r in passage_rows)
    right_margin = max(r["x1"] for r in passage_rows)
    parts = []
    para = []
    gaps = sorted(b["yc"] - a["yc"] for a, b in zip(passage_rows, passage_rows[1:]))
    line_gap = gaps[len(gaps) // 3] if gaps else mh * 2
    prev = None
    for r in passage_rows:
        is_heading = (r["x0"] > left_margin + 120 and r["x1"] < right_margin - 120 and not any(t.get("blank") for t in r["items"]))
        # khoảng cách dòng lớn bất thường = sang đoạn mới; dòng ngắn kết thúc bằng dấu phẩy/hai chấm (lời chào, To:/From:) cũng tách dòng
        new_para = prev is not None and (r["yc"] - prev["yc"] > line_gap * 1.45 or prev["x1"] < right_margin - 150)
        if is_heading:
            if para:
                parts.append(join_rows(para)); para = []
            parts.append("## " + join_rows([r]))
        else:
            if new_para and para:
                parts.append(join_rows(para)); para = []
            para.append(r)
        prev = r
    if para:
        parts.append(join_rows(para))
    text = tidy_blanks("\n".join(parts))
    n = 15

    def num(m):
        nonlocal n
        n += 1
        return f"{{{{{n}}}}}"
    text = re.sub(r"___", num, text)
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    # phương án: chia theo cột
    yopt = p6rows[iopt]["yc"] - mh
    opt_t = [t for t in p6t if t["y"] + t["h"] / 2 > yopt]
    orows = split_columns(opt_t, [], mid, mh)
    part6q = parse_questions(orows, {16, 17, 18})
    return part5, {"text": text, "blanks": n - 15, "questions": {k: v["options"] for k, v in part6q.items()}}


def parse_review(p1, p2):
    """Word Review: câu 1–10 hai cột (kiểu Part 5), sau đó các đoạn văn điền từ (kiểu Part 6).
    Đoạn văn đầu tiên có thể nằm cuối trang 1 còn phương án ở đầu trang 2 → nối hai trang thành một luồng."""
    toks = PAGES[p1]
    mh = med_height(toks)
    rows = build_rows(toks, [], mh)
    # mốc bắt đầu: dòng hướng dẫn "Choose the word…" (số "1." có thể bị OCR bỏ sót)
    ih = find_row(rows, r"best completes the sentence|Choose the word")
    top = rows[ih]["yc"] + mh if ih is not None else next((r["yc"] for r in rows if re.fullmatch(r"\d{1,2}[.,]", r["items"][0]["t"])), 0)
    ic = find_row(rows, r"the one word|one word or phrase")
    cut = rows[ic]["yc"] if ic is not None else 10 ** 6
    body = [t for t in toks if top - mh < t["y"] + t["h"] / 2 < cut - mh / 2]
    blanks = [b for b in underlines(p1) if top - mh < b["y"] < cut - mh / 2]
    singles = parse_questions(split_columns(body, blanks, page_width(p1) / 2, mh), set(range(1, 11)))
    stream = []
    if ic is not None:
        rest = [t for t in toks if t["y"] + t["h"] / 2 > cut + mh / 2]
        rb = [b for b in underlines(p1) if b["y"] > cut + mh / 2]
        stream += [dict(r, pno=p1) for r in build_rows(rest, rb, mh)]
    rows2 = build_rows(PAGES[p2], underlines(p2), med_height(PAGES[p2]))
    i0 = find_row(rows2, r"the one word|one word or phrase")
    # bỏ dòng tiêu đề đầu trang (nằm trong lề trên) — OCR có thể đọc sai chữ nên lọc theo vị trí
    rows2 = [r for k, r in enumerate(rows2) if r["yc"] > 230 and k != i0]
    stream += [dict(r, pno=p2) for r in rows2]
    return singles, parse_cloze_rows(stream, page_width(p2) / 2, mh)


def parse_cloze_rows(rows, mid, mh):
    """Luồng hàng gồm nhiều khối: đoạn văn có chỗ trống, theo sau là phương án (2 cột)."""
    def is_opt(r):
        first = next((t for t in r["items"] if not t.get("blank")), None)  # bỏ qua nét kẻ trang trí đứng đầu hàng
        return bool(first and (re.fullmatch(r"\d{1,2}[.,]", first["t"]) or OPT.match(first["t"])))
    blocks, cur = [], None
    for r in rows:
        if re.fullmatch(r"\d{1,3}", " ".join(t["t"] for t in r["items"])):
            continue  # số trang
        if is_opt(r):
            if cur is None:
                cur = {"rows": [], "opts": []}
                blocks.append(cur)
            cur["opts"].append(r)
        else:
            if cur is None or cur["opts"]:
                cur = {"rows": [], "opts": []}
                blocks.append(cur)
            cur["rows"].append(r)
    # phương án ở đầu trang 2 thuộc về đoạn văn cuối trang 1
    merged = []
    for b in blocks:
        if merged and not b["rows"] and not merged[-1]["opts"]:
            merged[-1]["opts"] = b["opts"]
        elif merged and not b["rows"]:
            merged[-1]["opts"] += b["opts"]
        else:
            merged.append(b)
    out = []
    for b in merged:
        if not b["opts"] or not b["rows"]:
            continue
        rows_p = b["rows"]
        for pn in {r["pno"] for r in rows_p}:
            fill_line_ends([r for r in rows_p if r["pno"] == pn], pn)
        text = tidy_blanks(join_rows(rows_p))
        opt_tokens = [t for r in b["opts"] for t in r["items"] if not t.get("blank")]
        # số câu có thể nằm giữa hàng (cột phải): "11. (A) hold   13. (A) satisfy"
        nums = sorted({int(it[k]["t"][:-1]) for r in b["opts"] for it in [r["items"]] for k in range(len(it) - 1)
                       if re.fullmatch(r"\d{1,2}[.,]", it[k]["t"]) and OPT.match(it[k + 1]["t"])})
        qs = parse_questions(split_columns(opt_tokens, [], mid, mh), set(nums))
        it = iter(nums)
        text = re.sub(r"___", lambda m: f"{{{{{next(it, 0)}}}}}", text)
        text = re.sub(r"\s+([.,;:!?])", r"\1", text)
        out.append({"text": text, "questions": [{"n": n, "options": qs.get(n, {}).get("options", {})} for n in nums]})
    return out


# ---------------------------------------------------------------- đáp án
def parse_key(pnos):
    text = ""
    for pno in pnos:
        toks = PAGES[pno]
        mh = med_height(toks)
        mid = page_width(pno) / 2
        for col in (0, 1):
            ct = [t for t in toks if (t["x"] + t["w"] / 2 < mid) == (col == 0)]
            text += " " + join_rows(build_rows(ct, [], mh))
    text = clean(text)
    # số thứ tự OCR đọc nhầm: "li." → "11.", "IO." → "10."
    text = re.sub(r"(?<=\s)([0-9IlOi]{1,2})(?=\s*[.,]\s)", lambda m: m.group(1).translate(str.maketrans("IliO", "1110")), text)
    key = {"lessons": {}, "reviews": {}}
    # Đánh số bài theo thứ tự xuất hiện (OCR đôi khi đọc sai số bài, vd "Lesson 33" → "Lesson Ord…")
    n = 0
    for m in re.finditer(r"Lesson (?!s)\S+ .*?Words [Ii]n Context:(.*?)Word Practice:(.*?)(?=Lesson |Word Review|$)", text):
        n += 1
        wic = [w.strip(" .") for w in re.split(r"\s*\b\d{1,2}\s*[.,]\s*", m.group(1)) if w.strip(" .")]
        wp = dict(re.findall(r"(\d{1,2})\s*[.,]\s*([A-D])\b", m.group(2)))
        key["lessons"][n] = {"wic": wic, "practice": {int(k): v for k, v in wp.items()}}
    # Word Review: số thứ tự hay bị OCR làm mất → đánh theo thứ tự xuất hiện; chấp nhận "l.c", "14B", "17 A", "12, D"
    for i, m in enumerate(re.finditer(r"Word Review\s*(?:#\s*\d+\s*:)?(.*?)(?=Lesson|Word Review|ANSWER|Word The|$)", text), 1):
        body = re.sub(r"(?<![A-Za-z])[lI](?=\s*[.,]?\s*[A-Da-d]\b)", "1", m.group(1))
        body = body.replace("II.", "11.").replace("Il.", "11.")
        key["reviews"][i] = {int(k): v.upper() for k, v in re.findall(r"(\d{1,2})\s*[.,]?\s*([A-Da-d])\b", body)}
    return key


GARBAGE = r"(?:[—\-_|]*[0-9IlLZßåa|]{0,3}[—\-_|]+[0-9IlLZßåa|]{0,3}[—\-_|]*|1[0-9]|[IlZ|])"


def tidy_blanks(text):
    """Xoá ký hiệu rác OCR dính quanh ___ (số câu in trên gạch dưới, nét gạch) và gộp ___ ___ liền nhau."""
    for _ in range(3):
        text = re.sub(r"(___)\s*" + GARBAGE + r"(?=\s|[.,;:!?]|$)", r"\1", text)
        text = re.sub(r"(?<=\s)" + GARBAGE + r"\s*(___)", r"\1", text)
        text = re.sub(r"___(\s*___)+", "___", text)
    return text


def merge_split_blanks(text, answers):
    """Đáp án nhiều từ có thể là 2 chỗ trống tách rời: "lock ___ themselves ___ into" → gộp thành 1 chỗ trống."""
    parts = re.split(r"\{\{\d+\}\}", text)
    n_blanks = len(parts) - 1
    out = [parts[0]]
    ai = 0
    j = 0
    while j < n_blanks:
        gap = parts[j + 1]
        ans = answers[ai].lower().split() if ai < len(answers) else []
        if (n_blanks - j) > (len(answers) - ai) and len(ans) > 1 and gap.strip() and gap.strip().lower() in ans[1:]:
            out[-1] += "{{BLANK}}"
            out.append(parts[j + 2] if j + 2 < len(parts) else "")
            j += 2
        else:
            out[-1] += "{{BLANK}}"
            out.append(gap)
            j += 1
        ai += 1
    text = "".join(out)
    n = 0

    def num(m):
        nonlocal n
        n += 1
        return f"{{{{{n}}}}}"
    return re.sub(r"\{\{BLANK\}\}", num, text), n


# ---------------------------------------------------------------- chạy
emap = json.load(open(args.map))
key = parse_key(range(333, 340))
out = {"lessons": {}, "reviews": {}}
problems = []
for n in range(1, 51):
    e = emap[str(n)]
    k = key["lessons"].get(n, {"wic": [], "practice": {}})
    rec = {}
    try:
        wic = parse_wic(e["wic"][0])
        if wic["blanks"] > len(k["wic"]):
            wic["text"], wic["blanks"] = merge_split_blanks(wic["text"], k["wic"])
        rec["wic"] = {"text": wic["text"], "answers": k["wic"]}
        if wic["blanks"] != 12 or len(k["wic"]) != 12:
            problems.append(f"Bài {n} WIC: {wic['blanks']} chỗ trống, {len(k['wic'])} đáp án")
    except Exception as ex:
        problems.append(f"Bài {n} WIC lỗi: {ex}")
    try:
        p5, p6 = parse_reading(e["read"][0])
        rec["part5"] = [{"n": q, **p5[q], "answer": k["practice"].get(q)} for q in sorted(p5)]
        for q in rec["part5"]:
            if q["text"].count("___") != 1 or len(q["options"]) != 4 or not q["answer"]:
                problems.append(f"Bài {n} câu {q['n']}: trống={q['text'].count('___')} pa={len(q['options'])} đa={q['answer']}")
        if len(p5) != 6:
            problems.append(f"Bài {n} Part 5: {len(p5)} câu")
        rec["part6"] = {"text": p6["text"], "questions": [{"n": q, "options": p6["questions"].get(q, {}), "answer": k["practice"].get(q)} for q in (16, 17, 18)]}
        if p6["blanks"] != 3 or any(len(q["options"]) != 4 or not q["answer"] for q in rec["part6"]["questions"]):
            problems.append(f"Bài {n} Part 6: trống={p6['blanks']} pa={[len(q['options']) for q in rec['part6']['questions']]}")
    except Exception as ex:
        problems.append(f"Bài {n} Reading lỗi: {ex}")
    out["lessons"][n] = rec

if args.review_pages:
    for i, spec in enumerate(args.review_pages.split(";"), 1):
        p1, p2 = [int(x) for x in spec.split(",")]
        try:
            singles, blocks = parse_review(p1, p2)
        except Exception as ex:
            problems.append(f"Ôn tập #{i} lỗi: {ex}")
            continue
        ans = key["reviews"].get(i, {})
        rv = {"part5": [{"n": q, **singles[q], "answer": ans.get(q)} for q in sorted(singles)],
              "part6": [{"text": b["text"], "questions": [dict(q, answer=ans.get(q["n"])) for q in b["questions"]]} for b in blocks]}
        out["reviews"][i] = rv
        for q in rv["part5"]:
            if q["text"].count("___") != 1 or len(q["options"]) != 4 or not q["answer"]:
                problems.append(f"Ôn tập #{i} câu {q['n']}: trống={q['text'].count('___')} pa={len(q['options'])} đa={q['answer']}")
        for b in rv["part6"]:
            nb = len(re.findall(r"\{\{\d+\}\}", b["text"]))
            if nb != len(b["questions"]) or "{{0}}" in b["text"] or any(len(q["options"]) != 4 or not q["answer"] for q in b["questions"]):
                problems.append(f"Ôn tập #{i} đoạn {[q['n'] for q in b['questions']]}: trống={nb} pa={[len(q['options']) for q in b['questions']]}")
        total = len(rv["part5"]) + sum(len(b["questions"]) for b in rv["part6"])
        if total != len(ans):
            problems.append(f"Ôn tập #{i}: {total} câu, {len(ans)} đáp án")

json.dump(out, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if PENDING_CROPS:
    print(f"Đã cắt {len(PENDING_CROPS)} dòng nghi sót chữ vào {args.crops} — chạy OCR rồi truyền --crops-ocr")
print(f"Xong. {len(problems)} vấn đề:")
print("\n".join(problems))
