"""Ghép dữ liệu sách (data/source) + phần bổ sung tiếng Việt (data/enrich) thành js/data.js

Chạy:  python tools/build_data.py
"""
import glob
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
book = json.load(open(os.path.join(ROOT, "data/source/book.json"), encoding="utf-8"))
fam_pages = {int(k): v for k, v in json.load(open(os.path.join(ROOT, "data/source/families.json"), encoding="utf-8")).items()}

UNITS = [
    ("business", "Kinh doanh tổng quát", "General Business", "briefcase", range(1, 6)),
    ("office", "Văn phòng", "Office Issues", "monitor", range(6, 11)),
    ("personnel", "Nhân sự", "Personnel", "users", range(11, 16)),
    ("purchasing", "Mua sắm & Cung ứng", "Purchasing", "cart", range(16, 21)),
    ("finance", "Tài chính & Ngân sách", "Financing and Budgeting", "coins", range(21, 26)),
    ("management", "Quản lý", "Management Issues", "building", range(26, 31)),
    ("restaurants", "Nhà hàng & Sự kiện", "Restaurants and Events", "utensils", range(31, 36)),
    ("travel", "Du lịch", "Travel", "plane", range(36, 41)),
    ("entertainment", "Giải trí", "Entertainment", "film", range(41, 46)),
    ("health", "Sức khoẻ", "Health", "heart", range(46, 51)),
]
LESSON_VI = ["Hợp đồng", "Tiếp thị", "Bảo hành", "Lập kế hoạch kinh doanh", "Hội nghị", "Máy tính",
             "Công nghệ văn phòng", "Quy trình văn phòng", "Thiết bị điện tử", "Thư tín", "Đăng tuyển & tuyển dụng",
             "Ứng tuyển & phỏng vấn", "Tuyển dụng & đào tạo", "Lương & phúc lợi", "Thăng chức, lương hưu & khen thưởng",
             "Mua sắm", "Đặt mua vật tư", "Vận chuyển", "Hoá đơn", "Hàng tồn kho", "Ngân hàng", "Kế toán", "Đầu tư",
             "Thuế", "Báo cáo tài chính", "Tài sản & phòng ban", "Họp hội đồng & uỷ ban", "Kiểm soát chất lượng",
             "Phát triển sản phẩm", "Thuê & cho thuê", "Chọn nhà hàng", "Ăn ngoài", "Đặt bữa trưa", "Nghề nấu ăn",
             "Sự kiện", "Du lịch chung", "Hãng hàng không", "Tàu hoả", "Khách sạn", "Thuê xe", "Phim ảnh", "Sân khấu",
             "Âm nhạc", "Bảo tàng", "Truyền thông", "Phòng khám", "Nha khoa", "Bảo hiểm y tế", "Bệnh viện", "Nhà thuốc"]

AFFIXES = {
    # ---- Tiền tố ----
    "un-": ("prefix", None, "không, ngược lại", "Phủ định tính từ; đảo ngược hành động (unlock)"),
    "in-": ("prefix", None, "không", "Phủ định (biến thể: im- trước b/m/p, il- trước l, ir- trước r)"),
    "im-": ("prefix", None, "không", "Biến thể của in- trước b, m, p (imbalance, impractical)"),
    "il-": ("prefix", None, "không", "Biến thể của in- trước l (illogical)"),
    "ir-": ("prefix", None, "không", "Biến thể của in- trước r (irresponsible, irregular)"),
    "dis-": ("prefix", None, "không, trái lại", "Phủ định động từ, danh từ, tính từ"),
    "mis-": ("prefix", None, "sai, nhầm", "Làm sai, làm tệ (misjudge, mismatch)"),
    "non-": ("prefix", None, "không", "Phủ định trung tính (non-refundable)"),
    "a-": ("prefix", None, "không", "Phủ định gốc Hy Lạp (atypical)"),
    "mal-": ("prefix", None, "xấu, hỏng", "Hoạt động sai, tệ (malfunction)"),
    "de-": ("prefix", None, "gỡ bỏ, đảo ngược", "Loại bỏ, làm ngược lại (decode, deregulate)"),
    "re-": ("prefix", None, "lại, lần nữa", "Lặp lại hành động (reassure, reorder)"),
    "pre-": ("prefix", None, "trước", "Xảy ra trước (predetermined, prerequisite)"),
    "fore-": ("prefix", None, "trước", "Trước (về thời gian) (forecast)"),
    "over-": ("prefix", None, "quá mức", "Làm quá nhiều (overcharge, overcrowded)"),
    "under-": ("prefix", None, "dưới mức, chưa đủ", "Làm chưa đủ (underestimate, underfunded)"),
    "out-": ("prefix", None, "ra ngoài; vượt hơn", "Ra ngoài, vượt qua (outsource, outdated)"),
    "up-": ("prefix", None, "lên", "Nâng lên, làm mới (update)"),
    "en-": ("prefix", None, "làm cho, đưa vào", "Tạo động từ (enable, entitle, encourage)"),
    "co-": ("prefix", None, "cùng nhau", "Cùng làm (coordinate)"),
    "inter-": ("prefix", None, "giữa, lẫn nhau", "Tương hỗ (interact)"),
    "sur-": ("prefix", None, "thêm, trên", "Phụ thêm (surcharge)"),
    "ac-": ("prefix", None, "hướng tới", "Biến thể của ad- (accustom)"),
    # ---- Hậu tố tạo danh từ ----
    "-tion": ("suffix", "n", "sự, việc", "Động từ → danh từ"),
    "-sion": ("suffix", "n", "sự, việc", "Động từ → danh từ (thường với gốc tận cùng -d, -de, -se)"),
    "-ation": ("suffix", "n", "sự, việc", "Động từ → danh từ"),
    "-ion": ("suffix", "n", "sự, việc", "Động từ → danh từ"),
    "-ition": ("suffix", "n", "sự, việc", "Động từ → danh từ (compete → competition)"),
    "-ison": ("suffix", "n", "sự", "Chỉ gặp trong comparison"),
    "-ment": ("suffix", "n", "sự, việc", "Động từ → danh từ"),
    "-ness": ("suffix", "n", "tính, sự", "Tính từ → danh từ chỉ tính chất"),
    "-ity": ("suffix", "n", "tính, khả năng", "Tính từ → danh từ"),
    "-ty": ("suffix", "n", "tính", "Tính từ → danh từ (loyalty, penalty)"),
    "-ance": ("suffix", "n", "sự", "Động từ → danh từ"),
    "-ence": ("suffix", "n", "sự", "Động từ / tính từ -ent → danh từ"),
    "-ancy": ("suffix", "n", "tình trạng", "Danh từ chỉ trạng thái (occupancy)"),
    "-ency": ("suffix", "n", "tình trạng", "Danh từ chỉ trạng thái (urgency)"),
    "-cy": ("suffix", "n", "tình trạng, tính", "Tính từ -t/-te → danh từ (accuracy, efficiency)"),
    "-age": ("suffix", "n", "sự, lượng", "Động từ → danh từ (storage, coverage)"),
    "-ure": ("suffix", "n", "sự, kết quả", "Động từ → danh từ (failure, departure)"),
    "-ture": ("suffix", "n", "sự, vật", "Động từ → danh từ (mixture)"),
    "-ature": ("suffix", "n", "sự, vật", "Động từ → danh từ (signature)"),
    "-al": ("suffix", "n/adj", "sự; thuộc về", "Động từ → danh từ (arrival, rehearsal) hoặc danh từ → tính từ (practical)"),
    "-ship": ("suffix", "n", "tình trạng, mối quan hệ", "Danh từ → danh từ trừu tượng (apprenticeship)"),
    "-th": ("suffix", "n", "tính chất", "Tính từ → danh từ, thường đổi gốc (strong → strength)"),
    "-ism": ("suffix", "n", "tính, chủ nghĩa", "Danh từ trừu tượng (criticism)"),
    "-dom": ("suffix", "n", "trạng thái", "Tính từ → danh từ (wisdom)"),
    "-ology": ("suffix", "n", "môn học", "Ngành, học thuyết (methodology)"),
    "-ice": ("suffix", "n", "sự", "Động từ → danh từ (service)"),
    "-is": ("suffix", "n", "sự", "Danh từ gốc Hy Lạp (diagnosis)"),
    "-se": ("suffix", "n", "sự", "Động từ → danh từ (response)"),
    "-ety": ("suffix", "n", "sự", "Danh từ (variety)"),
    "-ise": ("suffix", "n", "chuyên môn", "Danh từ chỉ chuyên môn (expertise)"),
    "-ior": ("suffix", "n", "cách, lối", "Danh từ (behavior)"),
    "-ele": ("suffix", "n", "tập hợp", "Chỉ gặp trong clientele"),
    "-s": ("suffix", "n", "(số nhiều mang nghĩa riêng)", "Danh từ số nhiều có nghĩa khác (returns, remains)"),
    # ---- Hậu tố chỉ người ----
    "-er": ("suffix", "n", "người / vật làm", "Động từ → người làm (employer, scanner)"),
    "-or": ("suffix", "n", "người / vật làm", "Động từ → người làm (investor, generator)"),
    "-itor": ("suffix", "n", "người làm", "Động từ → người làm (competitor)"),
    "-ee": ("suffix", "n", "người được / bị", "Động từ → người nhận hành động (trainee, attendee)"),
    "-ist": ("suffix", "n", "người, nhà", "Người chuyên về (specialist)"),
    "-ian": ("suffix", "n", "người chuyên", "Người làm nghề (technician)"),
    "-ant": ("suffix", "n/adj", "người; có tính", "Động từ → người (applicant, assistant) hoặc tính từ (hesitant)"),
    "-ent": ("suffix", "adj/n", "có tính", "Động từ → tính từ (confident) hoặc danh từ (repellent)"),
    # ---- Hậu tố tạo tính từ ----
    "-ful": ("suffix", "adj", "đầy, có", "Danh từ → tính từ (successful, forgetful)"),
    "-less": ("suffix", "adj", "không có", "Danh từ → tính từ (flavorless, regardless)"),
    "-able": ("suffix", "adj", "có thể", "Động từ → tính từ (affordable, refundable)"),
    "-ible": ("suffix", "adj", "có thể", "Biến thể của -able (accessible, flexible)"),
    "-ive": ("suffix", "adj", "có tính", "Động từ → tính từ (attractive, productive)"),
    "-ative": ("suffix", "adj", "có tính", "Động từ → tính từ (comparative, conservative)"),
    "-itive": ("suffix", "adj", "có tính", "Động từ → tính từ (competitive, sensitive)"),
    "-ial": ("suffix", "adj", "thuộc về", "Danh từ → tính từ (beneficial, essential)"),
    "-ic": ("suffix", "adj", "thuộc về", "Danh từ → tính từ (strategic, basic)"),
    "-ical": ("suffix", "adj", "thuộc về", "Danh từ → tính từ (typical, methodical)"),
    "-atic": ("suffix", "adj", "có tính", "Danh từ → tính từ (systematic, thematic)"),
    "-tic": ("suffix", "adj", "thuộc về", "Danh từ → tính từ (diagnostic, emphatic)"),
    "-ous": ("suffix", "adj", "có, đầy", "Danh từ → tính từ (cautious, nervous)"),
    "-ual": ("suffix", "adj", "thuộc về", "Danh từ → tính từ (habitual)"),
    "-y": ("suffix", "adj/n", "có, nhiều", "Danh từ → tính từ (risky, trendy); đôi khi tạo danh từ (delivery)"),
    "-ory": ("suffix", "adj/n", "có tính", "Động từ → tính từ (mandatory, satisfactory) hoặc danh từ (directory)"),
    "-atory": ("suffix", "adj/n", "có tính", "Động từ → tính từ / danh từ (preparatory, signatory)"),
    "-ary": ("suffix", "adj/n", "thuộc về", "Danh từ → tính từ (revolutionary, customary)"),
    "-ite": ("suffix", "adj", "thuộc về", "Chỉ gặp trong favorite"),
    "-some": ("suffix", "adj", "gây ra, có", "Danh từ → tính từ (burdensome)"),
    "-ate": ("suffix", "adj/v", "có tính; làm cho", "Tạo tính từ (considerate) hoặc động từ (validate)"),
    "-ed": ("suffix", "adj", "bị, được (cảm nhận)", "Quá khứ phân từ làm tính từ: cảm nhận / bị tác động (excited)"),
    "-ing": ("suffix", "adj/n", "gây ra; việc", "Tính từ chỉ bản chất gây ra (exciting) hoặc danh từ (training)"),
    "-n": ("suffix", "adj", "bị, được", "Quá khứ phân từ bất quy tắc (mistaken)"),
    # ---- Hậu tố tạo động từ ----
    "-ize": ("suffix", "v", "làm cho, hoá", "Danh từ / tính từ → động từ (minimize, specialize)"),
    "-ify": ("suffix", "v", "làm cho", "Tính từ → động từ (diversify)"),
    "-en": ("suffix", "v", "làm cho trở nên", "Tính từ → động từ (strengthen, broaden)"),
    # ---- Hậu tố tạo trạng từ ----
    "-ly": ("suffix", "adv", "một cách", "Tính từ → trạng từ. ⚠ Danh từ + -ly → TÍNH TỪ (leisurely)"),
}

OCR_FIX = {"ac�ssed": "accessed", "re'n�ts": "reports", "r�sum�": "résumé", "per�nt": "percent",
           "unne�ssary": "unnecessary", "as�rtain": "ascertain", "l�ation": "location", "spi�s": "spices",
           "on� a year": "once a year", "Acustomer": "A customer", "departrnent": "department", "concemed": "concerned",
           "conditionat": "conditional"}


def fix(s):
    for a, b in OCR_FIX.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def norm(w):
    return re.sub(r"[^a-z\- ]", "", w.lower()).strip()


# ---------- Đọc file bổ sung ----------
enrich = {}
for path in sorted(glob.glob(os.path.join(ROOT, "data/enrich/*.txt"))):
    lesson = None
    for ln, raw in enumerate(open(path, encoding="utf-8"), 1):
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        m = re.match(r"^# (\d+)\s*$", line)
        if m:
            lesson = int(m.group(1)); enrich[lesson] = []; continue
        if line.startswith("#"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if line.startswith("  "):
            if len(cols) < 4:
                sys.exit(f"{path}:{ln} dòng họ từ thiếu cột: {line}")
            enrich[lesson][-1]["family"].append({"w": cols[0], "pos": cols[1], "parts": [p.strip() for p in cols[2].split("+")],
                                                  "vi": cols[3], **({"note": cols[4]} if len(cols) > 4 and cols[4] else {})})
        else:
            if len(cols) != 4:
                sys.exit(f"{path}:{ln} dòng từ gốc cần 4 cột: {line}")
            split = lambda s: [] if s in ("", "-") else [x.strip() for x in s.split(",") if x.strip()]
            enrich[lesson].append({"word": cols[0], "vi": cols[1], "syn": split(cols[2]), "ant": split(cols[3]), "family": []})

# ---------- Ghép ----------
problems = []
lesson_pages = sorted(l["page"] for l in book)
out_lessons, out_words = [], []
for l in book:
    n = l["n"]
    unit = next(u for u in UNITS if n in u[4])
    next_page = next((p for p in lesson_pages if p > l["page"]), 10 ** 6)
    fp = next((p for p in sorted(fam_pages) if l["page"] < p < next_page), None)
    fam_rows = fam_pages.get(fp, [])
    fam_by_word = {}
    for r in fam_rows:
        if r["word"]:
            fam_by_word.setdefault(norm(fix(r["word"])), fix(r["sent"]))
    used_rows = set()

    def book_example(w):
        """Câu ví dụ trong WORD FAMILIES của sách (chấp nhận dạng -s / -d / -ed của từ)."""
        for k in (norm(w), norm(w) + "s", norm(w) + "d", norm(w) + "ed"):
            if k in fam_by_word:
                used_rows.add(k)
                return fam_by_word[k]
        return None

    heads = enrich.get(n, [])
    ents = l["entries"]
    if [norm(h["word"]) for h in heads] != [norm(e["word"]) for e in ents]:
        problems.append(f"Bài {n}: danh sách từ khác sách\n  sách : {[e['word'] for e in ents]}\n  bổ sung: {[h['word'] for h in heads]}")
        continue
    ids = []
    for e, h in zip(ents, heads):
        pos_m = re.match(r"^(v|n|adj|adv|prep|conj)\.", e["def"])
        pos = pos_m.group(1) if pos_m else ""
        definition = fix(re.sub(r"^(v|n|adj|adv|prep|conj)\.\s*", "", e["def"]))
        definition = re.sub(r";?\s*(v|n|adj|adv)\.,?\s*", lambda m: f"; ({m.group(1)}) ", definition)
        wid = re.sub(r"[^a-z0-9]+", "-", h["word"].lower()).strip("-") + f"-{n}"
        family = []
        for f in h["family"]:
            for p in f["parts"]:
                if (p.startswith("-") or p.endswith("-")) and len(p) > 1 and p not in AFFIXES:
                    problems.append(f"Bài {n} {f['w']}: thiếu phụ tố {p}")
            if f["pos"] not in ("n", "v", "adj", "adv", "phr", "prep"):
                problems.append(f"Bài {n} {f['w']}: từ loại lạ {f['pos']}")
            ex = book_example(f["w"])
            if ex:
                f = {**f, "ex": ex}
            family.append(f)
        self_fam = next((f for f in family if norm(f["w"]) == norm(h["word"])), None)
        out_words.append({
            "id": wid, "lesson": n, "word": h["word"], "pos": pos, "def": definition,
            "ex": [fix(x) for x in e["ex"]], "vi": h["vi"], "syn": h["syn"], "ant": h["ant"],
            "parts": self_fam["parts"] if self_fam else [h["word"]],
            "family": family,
        })
        ids.append(wid)
    unused = [r["word"] for r in fam_rows if r["word"] and norm(fix(r["word"])) not in used_rows]
    if unused:
        problems.append(f"Bài {n}: từ trong WORD FAMILIES của sách chưa dùng: {unused}")
    out_lessons.append({"n": n, "title": l["title"], "vi": LESSON_VI[n - 1], "unit": unit[0]})

topics = [{"id": u[0], "name": u[1], "en": u[2], "icon": u[3], "lessons": list(u[4])} for u in UNITS]
affixes = {k: {"type": v[0], "makes": v[1], "vi": v[2], "fn": v[3]} for k, v in AFFIXES.items()}

js = ("/* TỰ ĐỘNG TẠO bởi tools/build_data.py — đừng sửa tay. Sửa data/enrich/*.txt rồi chạy lại script. */\n"
      "const TOPICS = " + json.dumps(topics, ensure_ascii=False) + ";\n"
      "const LESSONS = " + json.dumps(out_lessons, ensure_ascii=False) + ";\n"
      "const AFFIXES = " + json.dumps(affixes, ensure_ascii=False, indent=0) + ";\n"
      "const WORDS = [\n" + ",\n".join(json.dumps(w, ensure_ascii=False) for w in out_words) + "\n];\n")
open(os.path.join(ROOT, "js/data.js"), "w", encoding="utf-8").write(js)

fam_total = sum(len(w["family"]) for w in out_words)
print(f"{len(out_lessons)} bài, {len(out_words)} từ gốc, {fam_total} từ trong họ từ, "
      f"{sum(1 for w in out_words for f in w['family'] if 'ex' in f)} câu ví dụ họ từ từ sách")
if problems:
    print("\n".join(problems))
