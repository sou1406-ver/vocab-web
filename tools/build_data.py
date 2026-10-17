"""Ghép dữ liệu sách (data/source) + phần bổ sung tiếng Việt (data/enrich) thành src/data/*.json

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
IPA_PATH = os.path.join(ROOT, "data/source/ipa.json")
IPA = json.load(open(IPA_PATH, encoding="utf-8")) if os.path.exists(IPA_PATH) else {}


def ipa_of(word, pos):
    """Phiên âm từ data/source/ipa.json (tạo bởi tools/make_ipa.py)."""
    w = word.lower().strip()
    return IPA.get(f"{w}|{pos}") or IPA.get(f"{w}|") or next((v for k, v in IPA.items() if k.split("|")[0] == w), None)


fam_pages = {
    int(k): v for k, v in json.load(open(os.path.join(ROOT, "data/source/families.json"), encoding="utf-8")).items()
}

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
LESSON_VI = [
    "Hợp đồng",
    "Tiếp thị",
    "Bảo hành",
    "Lập kế hoạch kinh doanh",
    "Hội nghị",
    "Máy tính",
    "Công nghệ văn phòng",
    "Quy trình văn phòng",
    "Thiết bị điện tử",
    "Thư tín",
    "Đăng tuyển & tuyển dụng",
    "Ứng tuyển & phỏng vấn",
    "Tuyển dụng & đào tạo",
    "Lương & phúc lợi",
    "Thăng chức, lương hưu & khen thưởng",
    "Mua sắm",
    "Đặt mua vật tư",
    "Vận chuyển",
    "Hoá đơn",
    "Hàng tồn kho",
    "Ngân hàng",
    "Kế toán",
    "Đầu tư",
    "Thuế",
    "Báo cáo tài chính",
    "Tài sản & phòng ban",
    "Họp hội đồng & uỷ ban",
    "Kiểm soát chất lượng",
    "Phát triển sản phẩm",
    "Thuê & cho thuê",
    "Chọn nhà hàng",
    "Ăn ngoài",
    "Đặt bữa trưa",
    "Nghề nấu ăn",
    "Sự kiện",
    "Du lịch chung",
    "Hãng hàng không",
    "Tàu hoả",
    "Khách sạn",
    "Thuê xe",
    "Phim ảnh",
    "Sân khấu",
    "Âm nhạc",
    "Bảo tàng",
    "Truyền thông",
    "Phòng khám",
    "Nha khoa",
    "Bảo hiểm y tế",
    "Bệnh viện",
    "Nhà thuốc",
]

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
    "-al": (
        "suffix",
        "n/adj",
        "sự; thuộc về",
        "Động từ → danh từ (arrival, rehearsal) hoặc danh từ → tính từ (practical)",
    ),
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

OCR_FIX = {
    "ac�ssed": "accessed",
    "re'n�ts": "reports",
    "r�sum�": "résumé",
    "per�nt": "percent",
    "unne�ssary": "unnecessary",
    "as�rtain": "ascertain",
    "l�ation": "location",
    "spi�s": "spices",
    "on� a year": "once a year",
    "Acustomer": "A customer",
    "departrnent": "department",
    "concemed": "concerned",
    "conditionat": "conditional",
}
# Lỗi OCR trong câu ví dụ (ký tự � = chữ OCR không đọc được)
OCR_FIX.update(
    {
        "ac�ssed": "accessed",
        "as�rtain": "ascertain",
        "caf�s": "cafés",
        "caf�": "café",
        "entr�e": "entrée",
        "l�ation": "location",
        "per�nt": "percent",
        "re'n�ts": "reports",
        "r�sum�": "résumé",
        "spi�s": "spices",
        "total�I": "total — I",
        "Intemet": "Internet",
        "govemment": "government",
        "retum": "return",
        "altemative": "alternative",
        "aftemoon": "afternoon",
        " wili ": " will ",
        " wilt ": " will ",
        " abte ": " able ",
        " atl ": " all ",
        "ionger": "longer",
        "Technicatly": "Technically",
        " feit ": " felt ",
        "cx)nfident": "confident",
        "suweed": "succeed",
        "mk up to as as": "look up to as much as",
        "goa:i": "good",
        "companyrs": "company's",
        "disptay": "display",
        "tildget": "budget",
        "comers of the shelves": "corners of the shelves",
        "wouid": "would",
        "we self it": "we sell it",
        "tie flavor": "the flavor",
        "tt is ": "It is ",
        "it took him over": "It took him over",
        "I'm tying": "I'm trying",
        "won't heat": "won't heal",
        "acmunt": "account",
        "wuorkers": "workers",
        "Dont ": "Don't ",
        " cant ": " can't ",
        " arent.": " aren't.",
        "couldnt": "couldn't",
        "con- sultation": "consultation",
        "com- mensurate": "commensurate",
        "time- consuming": "time-consuming",
        "expendi- ture": "expenditure",
        "prepa- ration": "preparation",
        "cus- tomers": "customers",
        "satis- faction": "satisfaction",
        "responsibili- ties": "responsibilities",
        "co- payments": "co-payments",
        "do-it- yourself": "do-it-yourself",
        "\"heat- resistant'": '"heat-resistant"',
        "f can provide": "I can provide",
        "If you file your taxes late": "If you file your taxes late",
        "creaning": "cleaning",
        "den- tist": "dentist",
        "prob- lems": "problems",
    }
)


def fix(s):
    s = re.sub("[æ•]", "�", s)  # OCR trang Word Families đọc chữ hỏng thành æ / •
    for a, b in OCR_FIX.items():
        s = s.replace(a, b)
    s = s.split(" Words in Context")[0]  # OCR dính cả đoạn bài tập vào câu ví dụ
    return re.sub(r"\s+", " ", s).strip()


def norm(w):
    return re.sub(r"[^a-z\- ]", "", w.lower()).strip()


# ---------- Bản dịch câu ví dụ (data/translations/*.txt) ----------
def tkey(s):
    """Khóa so khớp câu: chỉ giữ chữ thường + số, bỏ qua dấu câu và ký tự OCR lỗi."""
    return re.sub(r"[^a-z0-9]", "", fix(s).lower())


TRANS = {}
for path in sorted(glob.glob(os.path.join(ROOT, "data/translations/*.txt"))):
    en = None
    for ln, line in enumerate(open(path, encoding="utf-8"), 1):
        line = line.rstrip("\n")
        if not line.strip() or line.startswith("#"):
            continue
        if line.startswith("= "):
            if en is None:
                sys.exit(f"{path}:{ln} bản dịch không có câu tiếng Anh phía trên")
            TRANS[tkey(en)] = line[2:].strip()
            en = None
        else:
            en = line
used_trans = set()


def vi_of(sentence):
    k = tkey(sentence)
    if k in TRANS:
        used_trans.add(k)
        return TRANS[k]
    return None


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
            lesson = int(m.group(1))
            enrich[lesson] = []
            continue
        if line.startswith("#"):
            continue
        cols = [c.strip() for c in line.split("|")]
        if line.startswith("  "):
            if len(cols) < 4:
                sys.exit(f"{path}:{ln} dòng họ từ thiếu cột: {line}")
            enrich[lesson][-1]["family"].append(
                {
                    "w": cols[0],
                    "pos": cols[1],
                    "parts": [p.strip() for p in cols[2].split("+")],
                    "vi": cols[3],
                    **({"note": cols[4]} if len(cols) > 4 and cols[4] else {}),
                }
            )
        else:
            if len(cols) != 4:
                sys.exit(f"{path}:{ln} dòng từ gốc cần 4 cột: {line}")
            split = lambda s: [] if s in ("", "-") else [x.strip() for x in s.split(",") if x.strip()]
            enrich[lesson].append(
                {"word": cols[0], "vi": cols[1], "syn": split(cols[2]), "ant": split(cols[3]), "family": []}
            )

# ---------- Ghép ----------
problems = []
lesson_pages = sorted(l["page"] for l in book)
out_lessons, out_words = [], []
for l in book:
    n = l["n"]
    unit = next(u for u in UNITS if n in u[4])
    next_page = next((p for p in lesson_pages if p > l["page"]), 10**6)
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
        problems.append(
            f"Bài {n}: danh sách từ khác sách\n  sách : {[e['word'] for e in ents]}\n  bổ sung: {[h['word'] for h in heads]}"
        )
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
                vi = vi_of(ex)
                if vi:
                    f["exVi"] = vi
            ipa = ipa_of(f["w"], f["pos"])
            if ipa:
                f = {**f, "ipa": ipa}
            family.append(f)
        self_fam = next((f for f in family if norm(f["w"]) == norm(h["word"])), None)
        out_words.append(
            {
                "id": wid,
                "lesson": n,
                "word": h["word"],
                "pos": pos,
                "ipa": ipa_of(h["word"], pos) or "",
                "def": definition,
                **({"senses": e["senses"]} if e.get("senses") else {}),
                "ex": [fix(x) for x in e["ex"]],
                "exVi": [vi_of(x) or "" for x in e["ex"]],
                "vi": h["vi"],
                "syn": h["syn"],
                "ant": h["ant"],
                "parts": self_fam["parts"] if self_fam else [h["word"]],
                "family": family,
            }
        )
        ids.append(wid)
    unused = [r["word"] for r in fam_rows if r["word"] and norm(fix(r["word"])) not in used_rows]
    if unused:
        problems.append(f"Bài {n}: từ trong WORD FAMILIES của sách chưa dùng: {unused}")
    out_lessons.append({"n": n, "title": l["title"], "vi": LESSON_VI[n - 1], "unit": unit[0]})

topics = [{"id": u[0], "name": u[1], "en": u[2], "icon": u[3], "lessons": list(u[4])} for u in UNITS]
affixes = {k: {"type": v[0], "makes": v[1], "vi": v[2], "fn": v[3]} for k, v in AFFIXES.items()}

OUT_DIR = os.path.join(ROOT, "src/data")
os.makedirs(OUT_DIR, exist_ok=True)


def write_json(name, obj, one_per_line=False):
    """Ghi src/data/<name>.json (mảng lớn: mỗi phần tử một dòng để diff git dễ đọc)."""
    path = os.path.join(OUT_DIR, name + ".json")
    if one_per_line and isinstance(obj, list):
        text = "[\n" + ",\n".join(json.dumps(x, ensure_ascii=False) for x in obj) + "\n]\n"
    else:
        text = json.dumps(obj, ensure_ascii=False, indent=1) + "\n"
    open(path, "w", encoding="utf-8", newline="\n").write(text)


write_json("topics", topics)
write_json("lessons", out_lessons, one_per_line=True)
write_json("affixes", affixes)
write_json("words", out_words, one_per_line=True)

# ---------- Từ đồng nghĩa / trái nghĩa: nghĩa + độ phổ biến → src/data/terms.json ----------
# Nghĩa: lấy từ sách nếu từ đó có trong 600 từ (từ gốc / họ từ), không thì lấy data/relations.txt.
# Độ phổ biến: thang Zipf từ data/source/freq.json (tools/make_freq.py).
REL_VI = {}
for ln, line in enumerate(open(os.path.join(ROOT, "data/relations.txt"), encoding="utf-8"), 1):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    if " | " not in line:
        sys.exit(f"data/relations.txt:{ln} cần dạng 'từ | nghĩa': {line}")
    t, vi = line.split(" | ", 1)
    REL_VI[t.strip().lower()] = vi.strip()
FREQ_PATH = os.path.join(ROOT, "data/source/freq.json")
FREQ = json.load(open(FREQ_PATH, encoding="utf-8")) if os.path.exists(FREQ_PATH) else {}
BOOK_VI = {}
for w in out_words:
    BOOK_VI.setdefault(w["word"].lower(), w["vi"])
    for f in w["family"]:
        BOOK_VI.setdefault(f["w"].lower(), f["vi"])
terms = {}
rel_missing = []
for w in out_words:
    for t in w["syn"] + w["ant"]:
        k = t.lower()
        vi = BOOK_VI.get(k) or REL_VI.get(k)
        if not vi:
            rel_missing.append(t)
        terms[k] = {"vi": vi or "", "z": FREQ.get(k, 0)}
        ipa = ipa_of(k.split(";")[0].strip(), "")
        if ipa:
            terms[k]["ipa"] = ipa
for w in out_words:  # độ phổ biến của chính từ gốc (hiện cạnh tiêu đề)
    terms.setdefault(w["word"].lower(), {"vi": w["vi"], "z": FREQ.get(w["word"].lower(), 0)})
write_json("terms", dict(sorted(terms.items())))
print(f"Đồng nghĩa / trái nghĩa: {len(terms)} mục, {len(rel_missing)} từ chưa có nghĩa")
if rel_missing:
    print("  chưa có nghĩa:", ", ".join(sorted(set(rel_missing))[:30]))

fam_total = sum(len(w["family"]) for w in out_words)
print(
    f"{len(out_lessons)} bài, {len(out_words)} từ gốc, {fam_total} từ trong họ từ, "
    f"{sum(1 for w in out_words for f in w['family'] if 'ex' in f)} câu ví dụ họ từ từ sách"
)
missing = [x for w in out_words for x, v in zip(w["ex"], w["exVi"]) if not v]
missing += [f["ex"] for w in out_words for f in w["family"] if f.get("ex") and not f.get("exVi")]
print(f"Bản dịch câu ví dụ: dùng {len(used_trans)}/{len(TRANS)}, còn {len(missing)} câu chưa dịch")
problems += [f"Chưa dịch: {x}" for x in missing[:20]]
if problems:
    print("\n".join(problems))


# =====================================================================
# BÀI TẬP TRONG SÁCH → src/data/exercises.json
# =====================================================================
EX_PATH = os.path.join(ROOT, "data/source/exercises.json")
OV_PATH = os.path.join(ROOT, "data/source/exercises_overrides.json")
if os.path.exists(EX_PATH):
    ex = json.load(open(EX_PATH, encoding="utf-8"))
    ov = json.load(open(OV_PATH, encoding="utf-8")) if os.path.exists(OV_PATH) else {}

    def patch_questions(qs, patch):
        by_n = {str(q["n"]): q for q in qs}
        for k, v in patch.items():
            if k in by_n and isinstance(v, dict):
                q = by_n[k]
                if "options" in v:
                    q["options"] = {**q["options"], **v["options"]}  # chỉ ghi đè các phương án được sửa
                    q["options"] = {k: q["options"][k] for k in sorted(q["options"])}
                if "answer" in v:
                    q["answer"] = v["answer"]

    def patch_part6(p6, patch):
        if "text" in patch:
            p6["text"] = patch["text"]
        for a, b in patch.get("replace", []):
            p6["text"] = p6["text"].replace(a, b)
        patch_questions(p6["questions"], patch)

    for n, pv in ov.get("lessons", {}).items():
        L = ex["lessons"][n]
        if "wic_answers" in pv:
            L["wic"]["answers"] = pv["wic_answers"]
        if "part5" in pv:
            patch_questions(L["part5"], pv["part5"])
        if "part6" in pv:
            patch_part6(L["part6"], pv["part6"])
    for n, pv in ov.get("reviews", {}).items():
        R = ex["reviews"][n]
        if "part5" in pv:
            patch_questions(R["part5"], pv["part5"])
        if "part6" in pv:
            for blk in R["part6"]:
                patch_questions(blk["questions"], pv["part6"])

    def alternatives(a):
        """'achievements/merits' hoặc 'aggressive (or conservative)' → danh sách đáp án chấp nhận."""
        a = a.strip()
        m = re.match(r"^(.*?)\s*\(or\s+(.*?)\)$", a)
        if m:
            return [m.group(1).strip(), m.group(2).strip()]
        return [x.strip() for x in a.split("/") if x.strip()]

    TEXT_FIXES = ov.get("text_fixes", [])

    def ocr_fix(s):
        s = re.sub(
            r"(?<!\S)(?!___(?!_))\S*_\S*(?!\S)", "", s
        )  # chừa lại ký hiệu chỗ trống ___  # mảnh rác OCR còn dính dấu gạch dưới
        for a, b in TEXT_FIXES:  # khớp trọn từ để không sửa nhầm bên trong từ khác
            s = re.sub(r"(?<![A-Za-z])" + re.escape(a.strip()) + r"(?![A-Za-z])", b.strip(), s)
        return "\n".join(re.sub(r" {2,}", " ", fix(x)).strip() for x in s.split("\n"))

    out_ex = {"lessons": {}, "reviews": {}}
    ex_problems = []
    for n, L in ex["lessons"].items():
        rec = {}
        w = L.get("wic")
        if w:
            nb = len(re.findall(r"\{\{\d+\}\}", w["text"]))
            if nb != len(w["answers"]):
                ex_problems.append(f"Bài {n} WIC: {nb} chỗ trống / {len(w['answers'])} đáp án")
            rec["wic"] = {"text": ocr_fix(w["text"]), "answers": [alternatives(ocr_fix(a)) for a in w["answers"]]}
        p5 = [
            q
            for q in L.get("part5", [])
            if q["text"].count("___") == 1
            and len(q["options"]) == 4
            and all(q["options"].values())
            and q["answer"] in q["options"]
        ]
        if len(p5) != len(L.get("part5", [])):
            ex_problems.append(f"Bài {n} Part 5: bỏ {len(L.get('part5', [])) - len(p5)} câu lỗi")
        rec["part5"] = [
            {
                "n": q["n"],
                "text": ocr_fix(q["text"]),
                "options": {k: ocr_fix(v) for k, v in q["options"].items()},
                "answer": q["answer"],
            }
            for q in p5
        ]
        p6 = L.get("part6")
        if p6:
            ok = all(
                len(q["options"]) == 4 and all(q["options"].values()) and q["answer"] in q["options"]
                for q in p6["questions"]
            ) and len(re.findall(r"\{\{\d+\}\}", p6["text"])) == len(p6["questions"])
            if ok:
                rec["part6"] = {
                    "text": ocr_fix(p6["text"]),
                    "questions": [
                        dict(q, options={k: ocr_fix(v) for k, v in q["options"].items()}) for q in p6["questions"]
                    ],
                }
            else:
                ex_problems.append(f"Bài {n} Part 6 chưa hợp lệ — bỏ qua")
        out_ex["lessons"][n] = rec
    for n, R in ex["reviews"].items():
        p5 = [
            q
            for q in R["part5"]
            if q["text"].count("___") == 1
            and len(q["options"]) == 4
            and all(q["options"].values())
            and q["answer"] in q["options"]
        ]
        blocks = []
        for b in R["part6"]:
            if all(
                len(q["options"]) == 4 and all(q["options"].values()) and q["answer"] in q["options"]
                for q in b["questions"]
            ) and len(re.findall(r"\{\{\d+\}\}", b["text"])) == len(b["questions"]):
                blocks.append(
                    {
                        "text": ocr_fix(b["text"]),
                        "questions": [
                            dict(q, options={k: ocr_fix(v) for k, v in q["options"].items()}) for q in b["questions"]
                        ],
                    }
                )
            else:
                ex_problems.append(f"Ôn tập #{n} đoạn {[q['n'] for q in b['questions']]} chưa hợp lệ — bỏ qua")
        if len(p5) != len(R["part5"]):
            ex_problems.append(f"Ôn tập #{n}: bỏ {len(R['part5']) - len(p5)} câu lỗi")
        out_ex["reviews"][n] = {
            "part5": [
                {
                    "n": q["n"],
                    "text": ocr_fix(q["text"]),
                    "options": {k: ocr_fix(v) for k, v in q["options"].items()},
                    "answer": q["answer"],
                }
                for q in p5
            ],
            "part6": blocks,
        }

    write_json("exercises", out_ex)
    n_wic = sum(1 for L in out_ex["lessons"].values() if "wic" in L)
    n_p5 = sum(len(L["part5"]) for L in out_ex["lessons"].values())
    n_p6 = sum(1 for L in out_ex["lessons"].values() if "part6" in L)
    n_rv = sum(len(R["part5"]) + sum(len(b["questions"]) for b in R["part6"]) for R in out_ex["reviews"].values())
    print(f"Bài tập: {n_wic} đoạn Words in Context, {n_p5} câu Part 5, {n_p6} đoạn Part 6, {n_rv} câu Word Review")
    if ex_problems:
        print("\n".join(ex_problems))
