import type { Catalog, Snapshot, Word, WordProgress } from "../domain/types";
import { dayKey, nextDue } from "../domain/learning";
import { record, validateSnapshot } from "./validation";

export interface ImportPreview {
  id: string;
  kind: "backup" | "legacy";
  title: string;
  count: number;
  customCount: number;
  warnings: string[];
  snapshot?: Snapshot;
  progress?: Record<string, WordProgress>;
  customWords?: Word[];
  archive: unknown;
}
const string = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const finite = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback);
const object = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
export async function previewImport(text: string, catalog: Catalog, at = Date.now()): Promise<ImportPreview> {
  if (text.length > 10_000_000) throw new Error("File quá lớn. Vui lòng chọn bản sao lưu dưới 10 MB.");
  const source = record(JSON.parse(text));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const id = Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  if (source.app === "VocabLearn-v2" && source.data) {
    const snapshot = validateSnapshot(source.data);
    return {
      id,
      kind: "backup",
      title: "Bản sao lưu Vocab mới",
      count: Object.keys(snapshot.progress).length,
      customCount: snapshot.customWords.length,
      warnings: [],
      snapshot,
      archive: source,
    };
  }
  if (source.app !== "VocabLearn-600" || !source.status || typeof source.status !== "object")
    throw new Error("File không phải bản sao lưu Vocab được hỗ trợ.");
  const customWords: Word[] = [];
  const warnings: string[] = [];
  const ids = new Set(catalog.words.map((word) => word.id));
  for (const raw of Array.isArray(source.custom) ? source.custom : []) {
    const w = object(raw);
    const wid = string(w.id);
    if (
      !wid ||
      ids.has(wid) ||
      ["__proto__", "prototype", "constructor"].includes(wid) ||
      !string(w.word) ||
      !string(w.vi)
    ) {
      warnings.push(`Không ánh xạ được từ tự thêm: ${wid || "thiếu ID"}`);
      continue;
    }
    ids.add(wid);
    customWords.push({
      id: wid,
      text: string(w.word),
      meaning: string(w.vi),
      definition: string(w.def),
      pos: string(w.pos),
      ipa: string(w.ipa),
      lesson: 0,
      examples: (Array.isArray(w.ex) ? w.ex : [])
        .filter((x): x is string => typeof x === "string")
        .map((text, i) => ({ text, translation: string(Array.isArray(w.exVi) ? w.exVi[i] : "") })),
      family: (Array.isArray(w.family) ? w.family : []).map((f) => {
        const x = object(f);
        return { text: string(x.w), pos: string(x.pos), meaning: string(x.vi) };
      }),
      synonyms: (Array.isArray(w.syn) ? w.syn : []).filter((x): x is string => typeof x === "string"),
      antonyms: (Array.isArray(w.ant) ? w.ant : []).filter((x): x is string => typeof x === "string"),
      parts: [],
    });
  }
  const progress: Record<string, WordProgress> = {};
  for (const [wordId, status] of Object.entries(record(source.status))) {
    if (!ids.has(wordId)) {
      warnings.push(`Giữ trong bản gốc, chưa ánh xạ tiến độ: ${wordId}`);
      continue;
    }
    if (status === "new") continue;
    if (!["learning", "confirming", "mastered"].includes(status as string)) {
      warnings.push(`Trạng thái không hỗ trợ: ${wordId}`);
      continue;
    }
    const schedule = object(object(source.srs)[wordId]);
    const stats = object(object(source.stats)[wordId]);
    const startedAt = finite(object(source.statusAt)[wordId], at) || at;
    // Pending confirmations remain in review, never converted to new successes.
    const box =
      status === "confirming" || schedule.confirming === true
        ? 1
        : Math.min(6, Math.max(1, Math.floor(finite(schedule.box, status === "mastered" ? 5 : 1))));
    progress[wordId] = {
      startedAt,
      startedDay: dayKey(startedAt),
      box,
      dueAt: finite(schedule.due, nextDue(at, 1)),
      correct: finite(stats.c),
      incorrect: finite(stats.w),
      tested: true,
      policyVersion: 1,
    };
  }
  return {
    id,
    kind: "legacy",
    title: `Hồ sơ cũ${string(object(source.profile).name) ? ` · ${string(object(source.profile).name)}` : ""}`,
    count: Object.keys(progress).length,
    customCount: customWords.length,
    warnings,
    progress,
    customWords,
    archive: source,
  };
}
export function applyImport(current: Snapshot, preview: ImportPreview): Snapshot {
  if (current.imports.includes(preview.id)) throw new Error("Bản sao lưu này đã được nhập trước đó.");
  if (current.session && current.session.phase !== "complete")
    throw new Error("Hãy kết thúc lượt đang học trước khi nhập dữ liệu.");
  if (preview.kind === "backup") {
    const snapshot = validateSnapshot(preview.snapshot);
    return {
      ...snapshot,
      imports: [...new Set([...snapshot.imports, preview.id])],
      legacyArchives: [...snapshot.legacyArchives, { beforeRestore: current }],
    };
  }
  const progress = { ...current.progress };
  let overlap = 0;
  for (const [id, p] of Object.entries(preview.progress ?? {})) {
    if (!progress[id]) progress[id] = p;
    else overlap++;
  }
  const customWords = [...current.customWords];
  for (const word of preview.customWords ?? []) if (!customWords.some((w) => w.id === word.id)) customWords.push(word);
  return {
    ...current,
    progress,
    customWords,
    imports: [...current.imports, preview.id],
    legacyArchives: [
      ...current.legacyArchives,
      { importId: preview.id, overlapKept: overlap, source: preview.archive },
    ],
  };
}
