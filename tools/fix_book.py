"""Manual corrections for OCR/parse errors in book.json -> book_fixed.json"""
import json
import re
import sys

L = json.load(open(sys.argv[1], encoding="utf-8"))
by_n = {l["n"]: l for l in L}


def ent(n, w):
    return next(e for e in by_n[n]["entries"] if e["word"] == w)


def insert_after(n, after, new):
    es = by_n[n]["entries"]
    i = next(i for i, e in enumerate(es) if e["word"] == after)
    es.insert(i + 1, new)


def split_tail(n, w, i, marker, new_word, new_def):
    """ex[i] of word w contains '<end of sentence> <marker>...' -> tail becomes new_word's def; ex after i move to new word."""
    e = ent(n, w)
    head, tail = e["ex"][i].split(marker, 1)
    moved = e["ex"][i + 1:]
    e["ex"] = e["ex"][:i] + [head.strip()]
    insert_after(n, w, {"word": new_word, "def": new_def, "ex": moved})


# L2 persuasion -> productive
split_tail(2, "persuasion", 1, " adj., constructive", "productive", "adj. constructive; high yield")
# L7 reduction -> stay on top of
split_tail(7, "reduction", 1, " stay on top of", "stay on top of", "to know what is going on; to know the latest information")
# L9 skill -> software -> store
e = ent(9, "skill")
a, b = e["ex"][0].split(" b- ", 1)
b, _ = b.split(" software n-", 1)
rest = e["ex"][1:]
e["ex"] = [a, b]
sw_ex1 = rest[0].replace("re'n�ts", "reports")
sw_ex2, _ = rest[1].split(" store v-", 1)
insert_after(9, "skill", {"word": "software", "def": "n. the programs for a computer", "ex": [sw_ex1, sw_ex2]})
insert_after(9, "software", {"word": "store", "def": "v. to keep", "ex": rest[2:4]})
# L11 match -> profile
split_tail(11, "match", 1, " profile a group", "profile", "n. a group of characteristics or traits")
ent(11, "match")["ex"][0] = ent(11, "match")["ex"][0].replace("per- fect", "perfect")
# L15 dedication: two examples merged
e = ent(15, "dedication")
e["ex"] = [x.strip() for x in e["ex"][0].split(" b- ", 1)]
# L17 smooth: first example stuck in the definition
e = ent(17, "smooth")
d, ex1 = e["def"].split(" a- ", 1)
e["def"] = d
e["ex"] = [ex1] + e["ex"]
# L22 budget -> build up ; profitably -> reconcile
split_tail(22, "budget", 1, " build up", "build up", "v. to increase over time")
split_tail(22, "profitably", 1, " reconcile", "reconcile", "v. to make consistent")
# L31 appeal: word missing at start of definitions
es = by_n[31]["entries"]
arr = ent(31, "arrive")
es.insert(0, {"word": "appeal", "def": "n. the ability to attract",
              "ex": ["A restaurant with good food and reasonable prices has a lot of appeal.",
                     "The pleasing decor and friendly waiters are what give that restaurant its appeal."]})
# L37 excursion -> expense
split_tail(37, "excursion", 1, " n., something requiring payment", "expense", "n. something requiring payment")
# L39 chain -> check in
split_tail(39, "chain", 1, " check in", "check in", "v. to register at a hotel; to report one's presence")
# L46 diagnose -> effective
split_tail(46, "diagnose", 1, " adj., producing", "effective", "adj. producing the desired effect; being in effect")

# Spelling fixes of OCR'd headwords
WFIX = {"custorner": "customer", "distlngulsh": "distinguish", "entltle": "entitle", "dissemlnate": "disseminate",
        "be made ot": "be made of", "retum": "return", "weste": "waste", "sytematically": "systematically",
        "fan to": "fall to", "di9arate": "disparate"}
TITLE_FIX = {15: "Promotions, Pensions, and Awards", 27: "Board Meetings and Committees"}
for l in L:
    for e in l["entries"]:
        e["word"] = WFIX.get(e["word"], e["word"])
        e["def"] = re.sub(r"^(v|n|adj|adv|prep|conj)[.\-,]+\s*,?\s*", r"\1. ", e["def"].strip())
        e["ex"] = [re.sub(r"\s+", " ", x).replace("'n a", "In a").strip() for x in e["ex"]]
    l["title"] = TITLE_FIX.get(l["n"], l["title"])
    l["wordlist"] = [e["word"] for e in l["entries"]]

bad = [(l["n"], len(l["entries"])) for l in L if len(l["entries"]) != 12]
bad += [(l["n"], e["word"]) for l in L for e in l["entries"] if len(e["ex"]) != 2]
print("remaining problems:", bad)
json.dump(L, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
