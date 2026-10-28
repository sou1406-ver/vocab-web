import { dayKey, emptySnapshot, INTERVALS, nextDue } from "../domain/learning";
import type { AnswerEvent, Snapshot, WordProgress } from "../domain/types";
import { validateSnapshot } from "./validation";

export const INITIAL_GENERATION = "initial";
type Seed = { progress: WordProgress; covered: string[] };
interface Patch {
  settings?: Partial<Snapshot["settings"]>;
  seeds?: Record<string, Seed>;
  events?: AnswerEvent[];
  history?: Snapshot["history"];
  custom?: Record<string, Snapshot["customWords"][number] | null>;
  saved?: Record<string, boolean>;
  imports?: string[];
  archives?: unknown[];
}
export interface Change {
  version: 1;
  id: string;
  deviceId: string;
  generation: string;
  kind: "patch" | "import" | "restore";
  patch: Patch;
  restored?: Snapshot;
}
export interface CommittedChange {
  change: Change;
  order: number;
  committedAt: number;
}
export interface AccountRecord {
  syncVersion: 1;
  snapshot: Snapshot;
  confirmed: CommittedChange[];
  pending: Change[];
  guestDecision: boolean;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const safe = (id: string) => id && !["__proto__", "constructor", "prototype"].includes(id);
export function generationOf(confirmed: CommittedChange[], pending: Change[] = []) {
  return (
    [
      ...confirmed
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c) => c.change),
      ...pending,
    ]
      .filter((c) => c.kind === "restore")
      .at(-1)?.id ?? INITIAL_GENERATION
  );
}
export function newAccount(): AccountRecord {
  return { syncVersion: 1, snapshot: emptySnapshot(), confirmed: [], pending: [], guestDecision: false };
}
export function importChange(snapshot: Snapshot, id: string, deviceId: string, generation: string): Change {
  const seeds = Object.fromEntries(
    Object.entries(snapshot.progress).map(([wordId, p]) => [
      wordId,
      {
        progress: p,
        covered: snapshot.events.filter((e) => e.wordId === wordId).map((e) => e.id),
      },
    ]),
  );
  return {
    version: 1,
    id,
    deviceId,
    generation,
    kind: "import",
    patch: {
      settings: snapshot.settings,
      seeds,
      events: snapshot.events,
      history: snapshot.history,
      custom: Object.fromEntries(snapshot.customWords.map((w) => [w.id, w])),
      saved: Object.fromEntries((snapshot.savedWords ?? []).map((wordId) => [wordId, true])),
      imports: snapshot.imports,
      archives: snapshot.legacyArchives,
    },
  };
}
export function createChange(
  before: Snapshot,
  after: Snapshot,
  id: string,
  deviceId: string,
  generation: string,
): Change | null {
  const events = after.events.filter((e) => !before.events.some((old) => old.id === e.id));
  const changedWithoutEvent = Object.entries(before.progress).some(
    ([wordId, p]) => !equal(p, after.progress[wordId]) && !events.some((e) => e.wordId === wordId),
  );
  const removedEvent = before.events.some((e) => !after.events.some((item) => item.id === e.id));
  const restoredBackup = after.legacyArchives.some(
    (a) => a && typeof a === "object" && "beforeRestore" in a && !before.legacyArchives.includes(a),
  );
  if (changedWithoutEvent || removedEvent || restoredBackup) {
    return {
      version: 1,
      id,
      deviceId,
      generation,
      kind: "restore",
      patch: {},
      restored: { ...after, session: null, revision: 0 },
    };
  }
  const patch: Patch = {};
  const settings = Object.fromEntries(
    Object.entries(after.settings).filter(
      ([key, value]) => !equal(value, before.settings[key as keyof Snapshot["settings"]]),
    ),
  );
  if (Object.keys(settings).length) patch.settings = settings;
  const seeds = Object.fromEntries(
    Object.entries(after.progress)
      .filter(([wordId]) => !before.progress[wordId])
      .map(([wordId, p]) => [
        wordId,
        {
          progress: events.some((e) => e.wordId === wordId)
            ? {
                ...p,
                box: 0,
                dueAt: 0,
                correct: 0,
                incorrect: 0,
                tested: false,
                reviewedDay: undefined,
              }
            : p,
          covered: [],
        },
      ]),
  );
  if (Object.keys(seeds).length) patch.seeds = seeds;
  if (events.length) patch.events = events;
  const history = after.history.filter(
    (item) =>
      !equal(
        item,
        before.history.find((old) => old.id === item.id),
      ),
  );
  if (history.length) patch.history = history;
  const custom: NonNullable<Patch["custom"]> = Object.fromEntries(
    after.customWords
      .filter(
        (w) =>
          !equal(
            w,
            before.customWords.find((old) => old.id === w.id),
          ),
      )
      .map((w) => [w.id, w]),
  );
  for (const w of before.customWords) if (!after.customWords.some((next) => next.id === w.id)) custom[w.id] = null;
  if (Object.keys(custom).length) patch.custom = custom;
  const saved: Record<string, boolean> = {};
  for (const wordId of new Set([...(before.savedWords ?? []), ...(after.savedWords ?? [])])) {
    if (before.savedWords?.includes(wordId) !== after.savedWords?.includes(wordId))
      saved[wordId] = Boolean(after.savedWords?.includes(wordId));
  }
  if (Object.keys(saved).length) patch.saved = saved;
  const imports = after.imports.filter((item) => !before.imports.includes(item));
  if (imports.length) patch.imports = imports;
  const archives = after.legacyArchives.filter((a) => !before.legacyArchives.some((old) => equal(a, old)));
  if (archives.length) patch.archives = archives;
  return Object.keys(patch).length ? { version: 1, id, deviceId, generation, kind: "patch", patch } : null;
}
function applyEvent(snapshot: Snapshot, event: AnswerEvent, at: number) {
  if (event.questionKind === "match") return;
  const previous = snapshot.progress[event.wordId];
  if (!previous && event.mode === "practice") return;
  const day = dayKey(at, snapshot.settings.timezone);
  const p: WordProgress = previous ?? {
    startedAt: at,
    startedDay: day,
    box: 0,
    dueAt: 0,
    correct: 0,
    incorrect: 0,
    tested: false,
    policyVersion: 1,
  };
  const next = { ...p, correct: p.correct + Number(event.correct), incorrect: p.incorrect + Number(!event.correct) };
  if (event.mode === "learn" && !p.tested) {
    next.tested = true;
    next.box = 1;
    next.dueAt = nextDue(at, 1, snapshot.settings.timezone);
  } else if (event.mode === "review" && p.tested && p.dueAt <= at && p.reviewedDay !== day) {
    next.box = event.correct ? Math.min(6, p.box + 1) : 1;
    next.dueAt = nextDue(at, INTERVALS[next.box - 1], snapshot.settings.timezone);
    next.reviewedDay = day;
  }
  snapshot.progress[event.wordId] = next;
}
export function materialize(confirmed: CommittedChange[], pending: Change[] = []): Snapshot {
  let state = emptySnapshot();
  let generation = INITIAL_GENERATION;
  let covered = new Set<string>();
  const changes = new Set<string>();
  const events = new Set<string>();
  const apply = (change: Change, committedAt?: number) => {
    if (changes.has(change.id)) return;
    changes.add(change.id);
    if (change.version !== 1 || !safe(change.id) || !safe(change.deviceId) || change.generation !== generation)
      throw new Error("Tài khoản đã khôi phục dữ liệu ở máy khác. Hãy xuất bản sao trước khi dùng dữ liệu mới.");
    if (change.kind === "restore") {
      state = structuredClone(validateSnapshot(change.restored));
      state.session = null;
      generation = change.id;
      covered = new Set(state.events.map((e) => e.id));
      events.clear();
      state.events.forEach((e) => events.add(e.id));
      return;
    }
    if (change.kind !== "patch" && change.kind !== "import") throw new Error("Không đọc được phiên bản đồng bộ.");
    const patch = change.patch;
    if (patch.settings) {
      const fields = ["name", "dailyNew", "timezone", "theme", "avatarSeed", "bookId"];
      if (Object.keys(patch.settings).some((key) => !fields.includes(key)))
        throw new Error("Cài đặt đồng bộ không hợp lệ.");
      // Importing guest data must not overwrite preferences already set on the account.
      if (change.kind !== "import" || changes.size === 1) state.settings = { ...state.settings, ...patch.settings };
    }
    for (const [wordId, seed] of Object.entries(patch.seeds ?? {})) {
      if (!safe(wordId)) throw new Error("ID từ đồng bộ không hợp lệ.");
      if (!Object.hasOwn(state.progress, wordId)) {
        state.progress[wordId] = structuredClone(seed.progress);
        seed.covered.forEach((id) => covered.add(id));
      }
    }
    for (const event of patch.events ?? []) {
      if (!safe(event.wordId) || !safe(event.id)) throw new Error("Kết quả đồng bộ không hợp lệ.");
      if (events.has(event.id)) continue;
      events.add(event.id);
      state.events.push(event);
      if (!covered.has(event.id))
        applyEvent(state, event, change.kind === "import" ? event.at : (committedAt ?? event.at));
    }
    for (const item of patch.history ?? []) {
      state.history = state.history.filter((old) => old.id !== item.id);
      state.history.push(item);
    }
    for (const [id, word] of Object.entries(patch.custom ?? {})) {
      if (!safe(id) || (word && word.id !== id)) throw new Error("Từ riêng đồng bộ không hợp lệ.");
      state.customWords = state.customWords.filter((w) => w.id !== id);
      if (word) state.customWords.push(word);
    }
    if (patch.saved) {
      const saved = new Set(state.savedWords ?? []);
      for (const [id, value] of Object.entries(patch.saved)) {
        if (!safe(id) || typeof value !== "boolean") throw new Error("Từ yêu thích đồng bộ không hợp lệ.");
        if (value) saved.add(id);
        else saved.delete(id);
      }
      state.savedWords = [...saved].sort();
    }
    state.imports = [...new Set([...state.imports, ...(patch.imports ?? [])])];
    for (const archive of patch.archives ?? [])
      if (!state.legacyArchives.some((a) => equal(a, archive))) state.legacyArchives.push(archive);
  };
  confirmed
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((entry) => apply(entry.change, entry.committedAt));
  pending.forEach((change) => apply(change));
  return validateSnapshot(state);
}
