"use strict";
/* =====================================================================
   ĐĂNG NHẬP GOOGLE + ĐỒNG BỘ ĐÁM MÂY (Firebase Auth + Firestore)
   - Bật khi js/firebase-config.js có cấu hình; không có thì web chạy với hồ sơ trên máy.
   - Mỗi tài khoản Google = một hồ sơ "g_<uid>"; dữ liệu lưu ở Firestore users/<uid>.
   - Hai máy cùng học: dữ liệu được GỘP (lấy giá trị tốt hơn), không ghi đè mất tiến độ.
   ===================================================================== */
const FB_VERSION = "10.12.2";
const Cloud = {
  enabled: !!window.FIREBASE_CONFIG,
  ready: false,
  user: null,
  status: "idle", // idle | syncing | synced | error | offline
  lastSync: null,
  error: "",
  _timer: null,
  _unsub: null,
  _applying: false,
};
window.Cloud = Cloud;

const onHttp = () => location.protocol === "http:" || location.protocol === "https:";
const cloudProfileId = (uid) => "g_" + uid;
const isCloudProfile = (p) => !!(p && p.cloud && p.cloud.uid);

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error("Không tải được " + src));
    document.head.appendChild(s);
  });
}

// ---------------------------------------------------------------- đọc / ghi dữ liệu một hồ sơ
function readProfileData(pid) {
  const g = (k, d) => store.get(`${k}@${pid}`, d);
  return {
    custom: g("vn-custom", []),
    status: g("vn-status", {}),
    stats: g("vn-stats", {}),
    book: g("vn-book", {}),
    log: g("vn-log", {}),
  };
}
function writeProfileData(pid, d) {
  const s = (k, v) => store.set(`${k}@${pid}`, v);
  s("vn-custom", d.custom || []);
  s("vn-status", d.status || {});
  s("vn-stats", d.stats || {});
  s("vn-book", d.book || {});
  s("vn-log", d.log || {});
}

// Gộp hai bản dữ liệu: luôn giữ phần tiến bộ hơn → không mất dữ liệu khi học trên nhiều máy
function mergeData(a, b) {
  const rank = { mastered: 2, learning: 1 };
  const status = { ...a.status };
  for (const [id, s] of Object.entries(b.status || {})) if ((rank[s] || 0) > (rank[status[id]] || 0)) status[id] = s;
  const stats = { ...a.stats };
  for (const [id, s] of Object.entries(b.stats || {})) {
    const o = stats[id] || { c: 0, w: 0 };
    stats[id] = { c: Math.max(o.c, s.c || 0), w: Math.max(o.w, s.w || 0) };
  }
  const book = { ...a.book };
  for (const [k, v] of Object.entries(b.book || {})) {
    const o = book[k];
    if (!o || v.right / v.total > o.right / o.total || (v.right / v.total === o.right / o.total && v.at > o.at))
      book[k] = v;
  }
  const log = { ...a.log };
  for (const [k, v] of Object.entries(b.log || {})) {
    const o = log[k] || { a: 0, c: 0, f: 0, m: 0 };
    log[k] = {
      a: Math.max(o.a, v.a || 0),
      c: Math.max(o.c, v.c || 0),
      f: Math.max(o.f, v.f || 0),
      m: Math.max(o.m, v.m || 0),
    };
  }
  const custom = [...(a.custom || [])];
  for (const w of b.custom || []) {
    const i = custom.findIndex((x) => x.id === w.id);
    if (i < 0) custom.push(w);
  }
  return { custom, status, stats, book, log };
}
const sameData = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- khởi động
Cloud.init = async function () {
  if (!Cloud.enabled) return;
  if (!onHttp()) {
    Cloud.status = "offline";
    Cloud.error = "file";
    return;
  }
  try {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;
    await loadScript(`${base}/firebase-app-compat.js`);
    await Promise.all([
      loadScript(`${base}/firebase-auth-compat.js`),
      loadScript(`${base}/firebase-firestore-compat.js`),
    ]);
    firebase.initializeApp(window.FIREBASE_CONFIG);
    Cloud.auth = firebase.auth();
    Cloud.db = firebase.firestore();
    Cloud.ready = true;
    Cloud.auth.onAuthStateChanged((u) => (u ? Cloud.attach(u) : Cloud.detach()));
    // kết quả của đăng nhập kiểu chuyển trang (khi popup bị chặn)
    Cloud.auth.getRedirectResult().catch((e) => Cloud.fail(e));
  } catch (e) {
    Cloud.fail(e);
  }
  renderProfileChrome();
};

Cloud.signIn = async function () {
  if (!Cloud.ready) {
    toast(
      Cloud.error === "file"
        ? "Đăng nhập Google cần mở web qua http(s) — xem README"
        : "Chưa cấu hình đăng nhập Google",
    );
    return;
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await Cloud.auth.signInWithPopup(provider);
  } catch (e) {
    if (
      [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/cancelled-popup-request",
      ].includes(e.code)
    ) {
      await Cloud.auth.signInWithRedirect(provider);
    } else if (e.code !== "auth/popup-closed-by-user") {
      Cloud.fail(e);
    }
  }
};

Cloud.signOut = async function () {
  if (!Cloud.ready || !Cloud.user) return;
  await Cloud.flush();
  await Cloud.auth.signOut();
};

// Đã đăng nhập: tạo/nhận hồ sơ g_<uid>, gộp với dữ liệu trên mây, chuyển sang hồ sơ đó
Cloud.attach = async function (user) {
  Cloud.user = user;
  const pid = cloudProfileId(user.uid);
  const before = profile();
  let p = PROFILES.find((x) => x.id === pid);
  const ref = Cloud.db.collection("users").doc(user.uid);
  Cloud.status = "syncing";
  renderProfileChrome();
  try {
    const snap = await ref.get();
    const remote = snap.exists ? snap.data() : null;
    if (!p) {
      const base =
        remote && remote.profile
          ? remote.profile
          : { name: user.displayName || before.name, color: before.color, goal: before.goal, target: before.target };
      p = { ...base, id: pid, created: Date.now(), setup: true };
      PROFILES.push(p);
      // tài khoản mới tinh: mang tiến độ đang học trên máy lên tài khoản
      if (!remote && before && !isCloudProfile(before)) writeProfileData(pid, readProfileData(before.id));
    }
    p.cloud = { uid: user.uid, email: user.email || "", photo: user.photoURL || "" };
    if (remote && remote.profile)
      Object.assign(p, {
        name: remote.profile.name || p.name,
        color: remote.profile.color || p.color,
        goal: remote.profile.goal || p.goal,
        target: remote.profile.target || p.target,
      });
    const local = readProfileData(pid);
    const merged = remote ? mergeData(local, remote.data || {}) : local;
    writeProfileData(pid, merged);
    saveProfiles();
    if (CURRENT !== pid) switchProfile(pid, true);
    else {
      loadProfileData();
      rebuildIndex();
      render();
    }
    if (!remote || !sameData(merged, remote.data || {})) await Cloud.push();
    Cloud.status = "synced";
    Cloud.lastSync = new Date();
    toast(`Đã đăng nhập: ${user.displayName || user.email}`);
    // theo dõi thay đổi từ máy khác
    if (Cloud._unsub) Cloud._unsub();
    Cloud._unsub = ref.onSnapshot(
      (s) => {
        if (!s.exists || s.metadata.hasPendingWrites || CURRENT !== pid) return;
        const cur = readProfileData(pid);
        const m = mergeData(cur, s.data().data || {});
        if (!sameData(m, cur)) {
          Cloud._applying = true;
          writeProfileData(pid, m);
          loadProfileData();
          rebuildIndex();
          render();
          Cloud._applying = false;
          toast("Đã cập nhật tiến độ từ thiết bị khác");
        }
        Cloud.status = "synced";
        Cloud.lastSync = new Date();
        renderProfileChrome();
      },
      (e) => Cloud.fail(e),
    );
  } catch (e) {
    Cloud.fail(e);
  }
  renderProfileChrome();
};

// Đã đăng xuất: xoá bản lưu tạm của tài khoản trên máy (máy dùng chung) và quay về hồ sơ trên máy
Cloud.detach = function () {
  const was = Cloud.user;
  Cloud.user = null;
  if (Cloud._unsub) {
    Cloud._unsub();
    Cloud._unsub = null;
  }
  Cloud.status = "idle";
  if (!was) {
    renderProfileChrome();
    return;
  }
  const pid = cloudProfileId(was.uid);
  for (const k of PROFILE_KEYS) {
    try {
      localStorage.removeItem(`${k}@${pid}`);
    } catch (e) {
      /* bỏ qua */
    }
  }
  PROFILES = PROFILES.filter((x) => x.id !== pid);
  if (!PROFILES.length) {
    CURRENT = null;
    ensureProfile();
  }
  toast("Đã đăng xuất — tiến độ vẫn được lưu trên tài khoản Google");
  switchProfile(PROFILES[0].id, true);
};

Cloud.push = async function () {
  if (!Cloud.user) return;
  const pid = cloudProfileId(Cloud.user.uid);
  const p = PROFILES.find((x) => x.id === pid);
  if (!p) return;
  Cloud.status = "syncing";
  renderProfileChrome();
  try {
    await Cloud.db
      .collection("users")
      .doc(Cloud.user.uid)
      .set({
        profile: { name: p.name, color: p.color, goal: p.goal, target: p.target },
        data: readProfileData(pid),
        updatedAt: Date.now(),
      });
    Cloud.status = "synced";
    Cloud.lastSync = new Date();
  } catch (e) {
    Cloud.fail(e);
  }
  renderProfileChrome();
};
// Ghi trễ 1,5 giây để gom nhiều thay đổi liên tiếp thành một lần ghi
Cloud.onLocalChange = function () {
  if (!Cloud.user || Cloud._applying || !isCloudProfile(profile())) return;
  clearTimeout(Cloud._timer);
  Cloud._timer = setTimeout(() => Cloud.push(), 1500);
};
Cloud.flush = async function () {
  if (Cloud._timer) {
    clearTimeout(Cloud._timer);
    Cloud._timer = null;
    await Cloud.push();
  }
};
Cloud.fail = function (e) {
  console.warn("[Cloud]", e);
  Cloud.status = "error";
  Cloud.error = (e && (e.code || e.message)) || "lỗi";
  renderProfileChrome();
  const msg = {
    "auth/unauthorized-domain": "Tên miền này chưa được cho phép trong Firebase (Authorized domains)",
    "auth/operation-not-allowed": "Chưa bật Google trong Firebase Authentication",
    "permission-denied": "Firestore từ chối — kiểm tra Rules trong README",
    "auth/network-request-failed": "Mất kết nối mạng",
  }[e && e.code];
  toast(msg || "Lỗi đăng nhập / đồng bộ: " + Cloud.error);
};
window.addEventListener("beforeunload", () => {
  if (Cloud._timer) Cloud.push();
});

// ---------------------------------------------------------------- giao diện trong menu hồ sơ
const GOOGLE_G =
  '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
Cloud.menuHTML = function () {
  if (Cloud.user) {
    const st =
      {
        syncing: "Đang đồng bộ…",
        synced: `Đã đồng bộ${Cloud.lastSync ? " lúc " + Cloud.lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}`,
        error: "Lỗi đồng bộ — bấm để thử lại",
        idle: "",
      }[Cloud.status] || "";
    return `<div class="pm-cloud">
      <div class="pm-cloud-acc">${GOOGLE_G}<span>${esc(Cloud.user.email || "")}</span></div>
      <button class="pm-sync ${Cloud.status}" data-act="cloudSync" title="Đồng bộ ngay"><span class="sync-dot"></span>${st}</button>
    </div>`;
  }
  if (!Cloud.enabled) {
    return `<div class="pm-cloud off"><button class="google-btn" data-act="cloudSignIn" disabled>${GOOGLE_G} Đăng nhập với Google</button>
      <p class="pm-note" style="border:0;margin:0;padding:6px 2px 0">Chưa cấu hình — dán cấu hình Firebase vào <code>js/firebase-config.js</code> (xem README).</p></div>`;
  }
  return `<div class="pm-cloud"><button class="google-btn" data-act="cloudSignIn">${GOOGLE_G} Đăng nhập với Google</button>
    <p class="pm-note" style="border:0;margin:0;padding:6px 2px 0">${Cloud.error === "file" ? "Cần mở web qua http(s) (GitHub Pages hoặc localhost) để đăng nhập." : "Lưu tiến độ lên tài khoản, học tiếp trên mọi thiết bị."}</p></div>`;
};

Cloud.init();
