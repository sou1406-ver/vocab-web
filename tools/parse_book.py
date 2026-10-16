"""Parse OCR text of '600 Essential Words for the TOEIC Test' into structured JSON."""

import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8").read()

# Split into pages
pages = re.split(r"=====PAGE p(\d+)=====\n", text)
page_text = {int(pages[i]): pages[i + 1] for i in range(1, len(pages), 2)}

POS_RE = r"(?:v|n|adj|adv|prep|conj|pron)\."
FIX = {"assuranæ": "assurance", "pany": "party"}


def clean(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("—", "-")
    s = re.sub(r"\s+", " ", s).strip()
    return s


lessons = []
order = sorted(page_text)
for idx, pno in enumerate(order):
    t = page_text[pno]
    if "Study the following definitions and examples" not in t:
        continue
    lines = [l.strip() for l in t.splitlines() if l.strip()]
    # word list between "TO LEARN" and the title line
    try:
        i0 = lines.index("TO LEARN") + 1
    except ValueError:
        i0 = next(i for i, l in enumerate(lines) if "LEARN" in l) + 1
    i_study = next(i for i, l in enumerate(lines) if l.startswith("Study the following"))
    wordlist = lines[i0:i_study]
    title = wordlist[-1]
    wordlist = [FIX.get(w, w) for w in wordlist[:-1]]

    # Definitions block: after numbers until end of page (may continue on next page)
    body = lines[i_study + 1 :]
    body = [l for l in body if not re.fullmatch(r"\d+[.,]?", l)]
    nxt = page_text.get(pno + 1, "")
    if "WORDS IN CONTEXT" not in nxt:  # definitions spill onto next page
        extra = [l.strip() for l in nxt.splitlines() if l.strip()]
        extra = [l for l in extra if not re.match(r"^\d+ 600 ESSENTIAL", l) and not l.startswith("LESSON")]
        body += extra

    entries = []
    cur = None
    for l in body:
        l = clean(l)
        if re.match(r"^\d+ 600 ESSENTIAL", l) or re.fullmatch(r"\d+", l):
            continue
        m = re.match(r"^([A-Za-z' \-æ]+?)\s+(" + POS_RE + r"(?:/\w+\.)?),?\s*(.*)$", l)
        is_head = (
            m and not re.match(r"^[ab]\.", l) and len(entries) < 12 and m.group(1).strip().lower() not in ("a", "b")
        )
        if is_head:
            w = FIX.get(m.group(1).strip(), m.group(1).strip())
            cur = {"word": w, "def": m.group(2) + " " + m.group(3), "ex": []}
            entries.append(cur)
        elif cur is not None:
            mm = re.match(r"^([ab])\.\s*(.*)$", l)
            if mm:
                cur["ex"].append(mm.group(2))
            elif cur["ex"]:
                cur["ex"][-1] += " " + l
            else:
                cur["def"] += " " + l

    # Word families: search following pages for "WORD FAMILIES"
    fam = None
    for p2 in range(pno + 1, pno + 5):
        t2 = page_text.get(p2, "")
        if "WORD FAMILIES" in t2:
            fam_lines = [clean(l) for l in t2.split("WORD FAMILIES", 1)[1].splitlines() if l.strip()]
            fam = fam_lines
            break

    families = []
    if fam:
        fam = [l for l in fam if not re.fullmatch(r"\d+", l)]
        poss = []
        k = 0
        while k < len(fam):
            l = re.sub(r"^[Il|]\s+", "", fam[k]).strip().lower()
            if l in ("verb", "noun", "adjective", "adverb"):
                poss.append(l)
                k += 1
            else:
                break
        words = fam[k : k + len(poss)]
        rest = " ".join(fam[k + len(poss) :])
        sents = re.findall(r"[^.?!]+[.?!]+[\"']?", rest)
        sents = [s.strip() for s in sents]
        families = {"pos": poss, "words": words, "sentences": sents}

    lessons.append({"page": pno, "title": title, "wordlist": wordlist, "entries": entries, "families": families})

for i, l in enumerate(lessons):
    l["n"] = i + 1
json.dump(lessons, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Report
for l in lessons:
    fam = l["families"]
    probs = []
    if len(l["entries"]) != 12:
        probs.append(f"entries={len(l['entries'])}")
    if [e["word"].lower() for e in l["entries"]] != [w.lower() for w in l["wordlist"]]:
        probs.append("wordlist-mismatch")
    if any(len(e["ex"]) != 2 for e in l["entries"]):
        probs.append("ex!=2:" + ",".join(e["word"] for e in l["entries"] if len(e["ex"]) != 2))
    if not fam:
        probs.append("NOFAM")
    else:
        if len(fam["pos"]) != len(fam["words"]) or len(fam["words"]) != len(fam["sentences"]):
            probs.append(f"fam pos={len(fam['pos'])} w={len(fam['words'])} s={len(fam['sentences'])}")
    print(l["n"], l["title"], "OK" if not probs else probs)
