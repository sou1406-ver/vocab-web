import { create } from "zustand";
import { buildCatalog, type Catalog } from "@/lib/data";
import type { BookScore, DayLog, Profile, ProfileData, Status, Word } from "@/lib/types";
import { dayKey, storage } from "@/lib/util";

/* Hồ sơ học tập (nhiều người dùng chung một máy) + dữ liệu của hồ sơ đang mở.
   Khoá localStorage giữ nguyên như bản HTML cũ: "vn-status@<id hồ sơ>"… → nâng cấp không mất tiến độ. */

export const PROFILE_KEYS = ["vn-custom", "vn-status", "vn-stats", "vn-book", "vn-log", "vn-meta"] as const;
export const PROFILE_COLORS = ["#2f4b8f", "#a8442f", "#2f7a55", "#8a5a1f", "#6b3f87", "#2b6f7d"];
const FIELD: Record<(typeof PROFILE_KEYS)[number], keyof ProfileData> = {
  "vn-custom": "custom",
  "vn-status": "status",
  "vn-stats": "stats",
  "vn-book": "book",
  "vn-log": "log",
  "vn-meta": "meta",
};

export const emptyData = (): ProfileData => ({ meta: {}, custom: [], status: {}, stats: {}, book: {}, log: {} });

export function readProfileData(pid: string): ProfileData {
  const d = emptyData();
  for (const k of PROFILE_KEYS)
    (d as unknown as Record<string, unknown>)[FIELD[k]] = storage.get(`${k}@${pid}`, d[FIELD[k]]);
  return d;
}
export function writeProfileData(pid: string, d: ProfileData) {
  for (const k of PROFILE_KEYS) storage.set(`${k}@${pid}`, d[FIELD[k]]);
}
export function removeProfileData(pid: string) {
  for (const k of PROFILE_KEYS) storage.remove(`${k}@${pid}`);
}

export const newProfileId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function initProfiles(): { profiles: Profile[]; current: string } {
  let profiles = storage.get<Profile[]>("vn-profiles", []);
  let current = storage.get<string | null>("vn-current", null);
  if (!profiles.length) {
    const p: Profile = {
      id: newProfileId(),
      name: "Bạn",
      color: PROFILE_COLORS[0],
      goal: 20,
      target: 600,
      created: Date.now(),
      setup: false,
    };
    profiles = [p];
    // dữ liệu từ phiên bản rất cũ (chưa có hồ sơ) chuyển sang hồ sơ đầu tiên
    for (const k of PROFILE_KEYS) {
      const v = storage.get(k, null);
      if (v != null) storage.set(`${k}@${p.id}`, v);
    }
  }
  if (!current || !profiles.some((p) => p.id === current)) current = profiles[0].id;
  storage.set("vn-profiles", profiles);
  storage.set("vn-current", current);
  return { profiles, current };
}

type Listener = () => void;
const changeListeners = new Set<Listener>();
/** Đăng ký nghe mọi thay đổi dữ liệu (dùng cho đồng bộ đám mây) */
export const onDataChange = (fn: Listener) => {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
};
let silent = false;
/** Ghi dữ liệu nhận từ đám mây mà không kích hoạt đẩy ngược lên */
export function withoutSync(fn: () => void) {
  silent = true;
  try {
    fn();
  } finally {
    silent = false;
  }
}
const notify = () => {
  if (!silent) changeListeners.forEach((f) => f());
};

interface ProfileState extends ProfileData {
  profiles: Profile[];
  current: string;
  catalog: Catalog;

  profile: () => Profile;
  statusOf: (id: string) => Status;

  setStatus: (id: string, s: Status) => void;
  recordAnswer: (id: string, ok: boolean) => void;
  logActivity: (kind: "answer" | "card" | "mastered", ok?: boolean) => void;
  saveBookScore: (key: string, right: number, total: number) => void;
  saveCustomWord: (w: Word) => void;
  deleteCustomWord: (id: string) => void;
  resetProgress: () => void;
  importData: (d: Partial<ProfileData> & { profile?: Partial<Profile> }) => void;

  updateProfile: (patch: Partial<Profile>) => void;
  addProfile: (p: Omit<Profile, "id" | "created">) => string;
  switchProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  /** Nạp lại từ localStorage (sau khi đồng bộ ghi dữ liệu mới) */
  reload: () => void;
  setProfiles: (profiles: Profile[]) => void;
}

const init = initProfiles();
const initData = readProfileData(init.current);

export const useProfile = create<ProfileState>()((set, get) => {
  /** Ghi một phần dữ liệu của hồ sơ đang mở */
  const save = (patch: Partial<ProfileData>) => {
    const pid = get().current;
    for (const k of PROFILE_KEYS) {
      const f = FIELD[k];
      if (f in patch) storage.set(`${k}@${pid}`, patch[f]);
    }
    set(patch.custom ? { ...patch, catalog: buildCatalog(patch.custom) } : patch);
    notify();
  };
  const saveProfiles = (profiles: Profile[], current = get().current) => {
    storage.set("vn-profiles", profiles);
    storage.set("vn-current", current);
    set({ profiles, current });
    notify();
  };
  const load = (pid: string) => {
    const d = readProfileData(pid);
    set({ ...d, catalog: buildCatalog(d.custom) });
  };
  const bumpLog = (fn: (e: DayLog) => void) => {
    const log = { ...get().log };
    const k = dayKey();
    const e = { ...(log[k] ?? { a: 0, c: 0, f: 0, m: 0 }) };
    fn(e);
    log[k] = e;
    return log;
  };

  return {
    ...initData,
    profiles: init.profiles,
    current: init.current,
    catalog: buildCatalog(initData.custom),

    profile: () => get().profiles.find((p) => p.id === get().current) ?? get().profiles[0],
    statusOf: (id) => get().status[id] ?? "new",

    setStatus: (id, s) => {
      const status = { ...get().status };
      const patch: Partial<ProfileData> = {};
      if (s === "mastered" && status[id] !== "mastered") patch.log = bumpLog((e) => e.m++);
      if (s === "new") delete status[id];
      else status[id] = s;
      save({ ...patch, status });
    },
    recordAnswer: (id, ok) => {
      const stats = { ...get().stats };
      const st = { ...(stats[id] ?? { c: 0, w: 0 }) };
      if (ok) st.c++;
      else st.w++;
      stats[id] = st;
      const log = bumpLog((e) => {
        e.a++;
        if (ok) e.c++;
      });
      const patch: Partial<ProfileData> = { stats, log };
      if (!ok && !get().status[id]) patch.status = { ...get().status, [id]: "learning" };
      save(patch);
    },
    logActivity: (kind, ok) =>
      save({
        log: bumpLog((e) => {
          if (kind === "answer") {
            e.a++;
            if (ok) e.c++;
          } else if (kind === "card") e.f++;
          else e.m++;
        }),
      }),
    saveBookScore: (key, right, total) => {
      const book = { ...get().book };
      const prev: BookScore | undefined = book[key];
      if (!prev || right / total >= prev.right / prev.total) book[key] = { right, total, at: Date.now() };
      save({ book });
    },
    saveCustomWord: (word) => {
      const w = { ...word, updated: Date.now() };
      const custom = get().custom.slice();
      const i = custom.findIndex((x) => x.id === w.id);
      if (i >= 0) custom[i] = w;
      else custom.push(w);
      save({ custom });
    },
    deleteCustomWord: (id) => {
      const meta = get().meta;
      save({
        custom: get().custom.filter((x) => x.id !== id),
        // dấu "đã xoá" để máy khác không gộp từ này trở lại khi đồng bộ
        meta: { ...meta, deleted: [...new Set([...(meta.deleted ?? []), id])] },
      });
    },
    resetProgress: () =>
      save({ status: {}, stats: {}, book: {}, log: {}, meta: { ...get().meta, resetAt: Date.now() } }),
    importData: (d) => {
      const cur = get();
      const custom = cur.custom.slice();
      for (const w of d.custom ?? []) {
        const i = custom.findIndex((x) => x.id === w.id);
        if (i >= 0) custom[i] = w;
        else custom.push(w);
      }
      const log = { ...cur.log };
      for (const [k, v] of Object.entries(d.log ?? {})) log[k] ??= v;
      save({
        custom,
        status: { ...cur.status, ...d.status },
        stats: { ...cur.stats, ...d.stats },
        book: { ...cur.book, ...d.book },
        log,
      });
      const p = cur.profile();
      if (d.profile && !p.setup) get().updateProfile({ ...d.profile, id: p.id });
    },

    updateProfile: (patch) => {
      const { profiles, current } = get();
      saveProfiles(profiles.map((p) => (p.id === current ? { ...p, ...patch, id: p.id } : p)));
    },
    addProfile: (data) => {
      const p: Profile = { ...data, id: newProfileId(), created: Date.now() };
      saveProfiles([...get().profiles, p]);
      get().switchProfile(p.id);
      return p.id;
    },
    switchProfile: (id) => {
      saveProfiles(get().profiles, id);
      load(id);
    },
    deleteProfile: (id) => {
      const profiles = get().profiles.filter((p) => p.id !== id);
      if (!profiles.length) return;
      removeProfileData(id);
      saveProfiles(profiles, profiles[0].id);
      load(profiles[0].id);
    },
    reload: () => load(get().current),
    setProfiles: (profiles) => saveProfiles(profiles),
  };
});

// ---------------------------------------------------------------- thống kê dẫn xuất

/** Chuỗi ngày học liên tiếp (tính đến hôm nay, hoặc hôm qua nếu hôm nay chưa học) */
export function streakOf(log: Record<string, DayLog>) {
  const active = (d: Date) => {
    const e = log[dayKey(d)];
    return !!e && e.a + e.f > 0;
  };
  const d = new Date();
  if (!active(d)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (active(d)) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
