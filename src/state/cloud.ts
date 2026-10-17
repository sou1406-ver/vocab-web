import type { Auth, User } from "firebase/auth";
import type { DocumentReference, Firestore } from "firebase/firestore";
import { create } from "zustand";
import { FIREBASE_CONFIG } from "@/firebase-config";
import { mergeData, sameData } from "@/lib/merge";
import type { Profile, ProfileData } from "@/lib/types";
import {
  newProfileId,
  onDataChange,
  PROFILE_COLORS,
  readProfileData,
  removeProfileData,
  useProfile,
  withoutSync,
  writeProfileData,
} from "./profile";
import { toast, useUI } from "./ui";

/* Đăng nhập Google + đồng bộ đám mây (Firebase Auth + Firestore).
   - Mỗi tài khoản Google = một hồ sơ "g_<uid>"; dữ liệu ở Firestore users/<uid>.
   - Học trên hai máy: dữ liệu được GỘP (lấy giá trị tốt hơn), không ghi đè mất tiến độ.
   - SDK Firebase chỉ được tải khi có cấu hình (tách gói riêng, không làm nặng trang). */

export type CloudStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface CloudState {
  enabled: boolean;
  ready: boolean;
  user: { uid: string; email: string; name: string; photo: string } | null;
  status: CloudStatus;
  lastSync: Date | null;
  error: string;
}

export const useCloud = create<CloudState>()(() => ({
  enabled: !!FIREBASE_CONFIG,
  ready: false,
  user: null,
  status: "idle",
  lastSync: null,
  error: "",
}));

let auth: Auth | null = null;
let db: Firestore | null = null;
let fb: {
  auth: typeof import("firebase/auth");
  store: typeof import("firebase/firestore");
} | null = null;
let unsub: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
/** true khi người dùng vừa bấm "Đăng nhập" (không phải phiên cũ tự khôi phục lúc tải trang) */
let userInitiated = false;
const REDIRECT_FLAG = "vn-signin-redirect";

const cloudPid = (uid: string) => "g_" + uid;
const setCloud = (p: Partial<CloudState>) => useCloud.setState(p);
const onHttp = () => location.protocol === "http:" || location.protocol === "https:";

function fail(e: unknown) {
  const err = e as { code?: string; message?: string };
  console.warn("[Cloud]", e);
  const code = err?.code || err?.message || "lỗi";
  setCloud({ status: "error", error: code });
  const msg: Record<string, string> = {
    "auth/unauthorized-domain": "Tên miền này chưa được cho phép trong Firebase (Authorized domains)",
    "auth/operation-not-allowed": "Chưa bật Google trong Firebase Authentication",
    "permission-denied": "Firestore từ chối — kiểm tra Rules trong README",
    "auth/network-request-failed": "Mất kết nối mạng",
  };
  toast(msg[err?.code ?? ""] ?? "Lỗi đăng nhập / đồng bộ: " + code);
}

function userDoc(uid: string): DocumentReference {
  return fb!.store.doc(db!, "users", uid);
}

export async function initCloud() {
  if (!FIREBASE_CONFIG) return;
  if (!onHttp()) {
    setCloud({ status: "offline", error: "file" });
    return;
  }
  try {
    const [app, a, s] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ]);
    fb = { auth: a, store: s };
    const fapp = app.initializeApp(FIREBASE_CONFIG);
    auth = a.getAuth(fapp);
    db = s.getFirestore(fapp);
    setCloud({ ready: true });
    a.onAuthStateChanged(auth, (u) => (u ? attach(u) : detach()));
    // kết quả của đăng nhập kiểu chuyển trang (khi popup bị chặn)
    a.getRedirectResult(auth).catch(fail);
  } catch (e) {
    fail(e);
  }
}

export async function signIn() {
  const { ready, error } = useCloud.getState();
  if (!ready || !auth || !fb) {
    toast(error === "file" ? "Đăng nhập Google cần mở web qua http(s) — xem README" : "Chưa cấu hình đăng nhập Google");
    return;
  }
  const provider = new fb.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  userInitiated = true;
  try {
    await fb.auth.signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (
      [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/cancelled-popup-request",
      ].includes(code)
    ) {
      sessionStorage.setItem(REDIRECT_FLAG, "1");
      await fb.auth.signInWithRedirect(auth, provider);
    } else {
      userInitiated = false;
      if (code !== "auth/popup-closed-by-user") fail(e);
    }
  }
}

export async function signOut() {
  if (!auth || !fb || !useCloud.getState().user) return;
  await flush();
  await fb.auth.signOut(auth);
}

function switchTo(pid: string) {
  const prof = useProfile.getState();
  if (prof.current !== pid) {
    prof.switchProfile(pid);
    useUI.getState().resetSession();
  } else prof.reload();
}

async function attach(u: User) {
  const pid = cloudPid(u.uid);
  // vừa đăng nhập (popup hoặc quay về từ trang đăng nhập) → chuyển sang hồ sơ Google + báo;
  // phiên cũ tự khôi phục khi tải trang → giữ nguyên hồ sơ đang dùng, không báo
  let explicit = userInitiated;
  try {
    explicit ||= sessionStorage.getItem(REDIRECT_FLAG) === "1";
    sessionStorage.removeItem(REDIRECT_FLAG);
  } catch {
    /* bỏ qua */
  }
  userInitiated = false;
  setCloud({
    user: { uid: u.uid, email: u.email ?? "", name: u.displayName ?? "", photo: u.photoURL ?? "" },
    status: "syncing",
  });
  const ref = userDoc(u.uid);
  try {
    const snap = await fb!.store.getDoc(ref);
    const remote = snap.exists() ? (snap.data() as { profile?: Partial<Profile>; data?: Partial<ProfileData> }) : null;
    const prof = useProfile.getState();
    const before = prof.profile();
    let profiles = prof.profiles.slice();
    let p = profiles.find((x) => x.id === pid);
    if (!p) {
      const base = remote?.profile ?? {
        name: u.displayName || before.name,
        color: before.color || PROFILE_COLORS[0],
        goal: before.goal,
        target: before.target,
      };
      p = {
        goal: 20,
        target: 600,
        color: PROFILE_COLORS[0],
        name: "Học viên",
        ...base,
        id: pid,
        created: Date.now(),
        setup: true,
      };
      profiles.push(p);
      // tài khoản mới tinh: mang tiến độ đang học trên máy lên tài khoản
      if (!remote && before && !before.cloud) writeProfileData(pid, readProfileData(before.id));
    }
    const rp = remote?.profile;
    p = {
      ...p,
      name: rp?.name || p.name,
      color: rp?.color || p.color,
      goal: rp?.goal || p.goal,
      target: rp?.target || p.target,
      cloud: { uid: u.uid, email: u.email ?? "", photo: u.photoURL ?? "" },
    };
    profiles = profiles.map((x) => (x.id === pid ? p! : x));
    if (!profiles.some((x) => x.id === pid)) profiles.push(p);

    const local = readProfileData(pid);
    const merged = remote ? mergeData(local, remote.data ?? {}) : local;
    withoutSync(() => {
      writeProfileData(pid, merged);
      useProfile.getState().setProfiles(profiles);
      if (explicit || useProfile.getState().current === pid) switchTo(pid);
    });
    if (!remote || !sameData(merged, remote.data ?? {})) await push();
    setCloud({ status: "synced", lastSync: new Date() });
    if (explicit) toast(`Đã đăng nhập: ${u.displayName || u.email}`);

    // theo dõi thay đổi từ máy khác
    unsub?.();
    unsub = fb!.store.onSnapshot(
      ref,
      (s) => {
        if (!s.exists() || s.metadata.hasPendingWrites || useProfile.getState().current !== pid) return;
        const cur = readProfileData(pid);
        const m = mergeData(cur, (s.data() as { data?: Partial<ProfileData> }).data ?? {});
        if (!sameData(m, cur)) {
          withoutSync(() => {
            writeProfileData(pid, m);
            useProfile.getState().reload();
          });
          toast("Đã cập nhật tiến độ từ thiết bị khác");
        }
        setCloud({ status: "synced", lastSync: new Date() });
      },
      fail,
    );
  } catch (e) {
    fail(e);
  }
}

/** Đã đăng xuất: xoá bản lưu tạm của tài khoản trên máy (máy dùng chung) và quay về hồ sơ trên máy */
function detach() {
  const was = useCloud.getState().user;
  setCloud({ user: null, status: "idle" });
  unsub?.();
  unsub = null;
  if (!was) return;
  const pid = cloudPid(was.uid);
  removeProfileData(pid);
  const prof = useProfile.getState();
  let profiles = prof.profiles.filter((x) => x.id !== pid);
  if (!profiles.length)
    profiles = [
      {
        id: newProfileId(),
        name: "Học viên",
        color: PROFILE_COLORS[0],
        goal: 20,
        target: 600,
        created: Date.now(),
        setup: false,
      },
    ];
  withoutSync(() => {
    prof.setProfiles(profiles);
    switchTo(profiles[0].id);
  });
  toast("Đã đăng xuất — tiến độ vẫn được lưu trên tài khoản Google");
}

export async function push() {
  const user = useCloud.getState().user;
  if (!user || !db || !fb) return;
  const pid = cloudPid(user.uid);
  const p = useProfile.getState().profiles.find((x) => x.id === pid);
  if (!p) return;
  setCloud({ status: "syncing" });
  try {
    await fb.store.setDoc(userDoc(user.uid), {
      profile: { name: p.name, color: p.color, goal: p.goal, target: p.target },
      data: readProfileData(pid),
      updatedAt: Date.now(),
    });
    setCloud({ status: "synced", lastSync: new Date() });
  } catch (e) {
    fail(e);
  }
}

export async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    await push();
  }
}

// Ghi trễ 1,5 giây để gom nhiều thay đổi liên tiếp thành một lần ghi
onDataChange(() => {
  const user = useCloud.getState().user;
  if (!user || !useProfile.getState().profile().cloud) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void push();
  }, 1500);
});

if (typeof window !== "undefined")
  window.addEventListener("beforeunload", () => {
    if (timer) void push();
  });
