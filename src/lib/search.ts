import type { Catalog } from "./data";
import type { Word } from "./types";
import { fold, lower, same } from "./util";

export interface SearchHit {
  form: string;
  pos: string;
  vi: string;
  ipa?: string;
  root: Word;
  kind: "root" | "family" | "syn";
  ff: string;
  fv: string;
}

const cache = new WeakMap<Catalog, SearchHit[]>();

function indexOf(cat: Catalog) {
  let idx = cache.get(cat);
  if (idx) return idx;
  idx = [];
  for (const w of cat.all) {
    idx.push({ form: w.word, pos: w.pos, vi: w.vi, ipa: w.ipa, root: w, kind: "root", ff: "", fv: "" });
    for (const f of w.family)
      if (!same(f.w, w.word))
        idx.push({ form: f.w, pos: f.pos, vi: f.vi, ipa: f.ipa, root: w, kind: "family", ff: "", fv: "" });
    for (const s of w.syn)
      idx.push({ form: s, pos: "", vi: `đồng nghĩa của “${w.word}”`, root: w, kind: "syn", ff: "", fv: "" });
  }
  for (const e of idx) {
    e.ff = fold(e.form);
    e.fv = fold(e.vi);
  }
  cache.set(cat, idx);
  return idx;
}

/** Tìm toàn trang: khớp đầu từ > trong cụm > một phần > nghĩa Việt; mỗi dạng từ chỉ hiện một lần */
export function searchWords(cat: Catalog, q: string, limit = 10): SearchHit[] {
  const f = fold(q.trim());
  if (!f) return [];
  const kindRank = { root: 0, family: 1, syn: 2 };
  const scored: [number, SearchHit][] = [];
  for (const e of indexOf(cat)) {
    let s = -1;
    if (e.ff === f) s = 0;
    else if (e.ff.startsWith(f)) s = 1;
    else if (e.ff.includes(" " + f) || e.ff.includes("-" + f)) s = 2;
    else if (f.length >= 3 && e.ff.includes(f)) s = 3;
    else if (f.length >= 2 && e.kind !== "syn" && e.fv.includes(f)) s = 4;
    if (s >= 0) scored.push([s * 10 + kindRank[e.kind], e]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].form.length - b[1].form.length);
  const seen = new Set<string>();
  return scored
    .map((x) => x[1])
    .filter((e) => {
      const k = lower(e.form);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}

/** Lý do một từ gốc khớp với ô tìm của trang Trường từ */
export function matchReason(w: Word, q: string): string | null {
  const f = fold(q);
  if (fold(w.word).includes(f)) return null;
  const fam = w.family.find((x) => fold(x.w).includes(f));
  if (fam) return `${fam.w} (họ từ)`;
  const syn = w.syn.find((x) => fold(x).includes(f));
  if (syn) return `${syn} (đồng nghĩa)`;
  const ant = w.ant.find((x) => fold(x).includes(f));
  if (ant) return `${ant} (trái nghĩa)`;
  if (fold(w.vi).includes(f)) return "nghĩa tiếng Việt";
  const famVi = w.family.find((x) => fold(x.vi).includes(f));
  if (famVi) return `${famVi.w}: ${famVi.vi}`;
  return null;
}
