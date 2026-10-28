import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { Change, CommittedChange } from "../data/sync";

// Firebase web configuration is public. Data access is enforced by firestore.rules.
// Only the new project is used; the V1 production project is never initialized.
const emulated = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCwcc6NYcrLS8CbnSvIJZ2AX4W50D8uENo",
  authDomain: "vocab-web-next.firebaseapp.com",
  projectId: emulated ? "demo-vocab-sync" : "vocab-web-next",
  appId: "1:670784686937:web:533efebb0ae99a195d9a48",
};
let client: ReturnType<typeof initialize> | undefined;
function initialize() {
  const app = getApps().find((a) => a.name === "vocab-web-next") ?? initializeApp(config, "vocab-web-next");
  const auth = getAuth(app);
  const db = getFirestore(app);
  // Explicit build-time opt-in; ordinary localhost/Vercel builds use the real project.
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" && ["localhost", "127.0.0.1"].includes(location.hostname)) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return { auth, db };
}
export function firebaseClient() {
  if (typeof window === "undefined") throw new Error("Firebase chỉ mở trong trình duyệt.");
  return (client ??= initialize());
}
export type AccountUser = Pick<User, "uid" | "displayName" | "email">;
export function observeUser(next: (user: AccountUser | null) => void, error: (e: unknown) => void) {
  return onAuthStateChanged(firebaseClient().auth, next, error);
}
export function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(firebaseClient().auth, provider);
}
export function logoutGoogle() {
  return signOut(firebaseClient().auth);
}
export interface CloudTransport {
  subscribe: (next: (changes: CommittedChange[]) => void, error: (error: unknown) => void) => () => void;
  append: (change: Change) => Promise<CommittedChange>;
}
export function splitPayload(payload: string) {
  if (new TextEncoder().encode(payload).byteLength > 6_000_000)
    throw new Error("Dữ liệu nhập vượt 6 MB. Bản gốc vẫn được giữ trên máy; hãy xuất bản sao để kiểm tra.");
  const parts: string[] = [];
  for (let offset = 0; offset < payload.length; ) {
    let end = Math.min(offset + 150000, payload.length);
    const last = payload.charCodeAt(end - 1);
    if (end < payload.length && last >= 0xd800 && last <= 0xdbff) end--;
    parts.push(payload.slice(offset, end));
    offset = end;
  }
  return parts;
}
export function firestoreTransport(uid: string, db: Firestore = firebaseClient().db): CloudTransport {
  const changes = collection(db, "users", uid, "changes");
  const head = doc(db, "users", uid, "sync", "state");
  const cached = new Map<string, CommittedChange>();
  async function readEntry(id: string, raw: Record<string, unknown>): Promise<CommittedChange> {
    if (cached.has(id)) return cached.get(id)!;
    if (
      !Number.isSafeInteger(raw.order) ||
      !Number.isSafeInteger(raw.parts) ||
      Number(raw.parts) < 1 ||
      Number(raw.parts) > 100 ||
      !raw.at ||
      typeof (raw.at as { toMillis?: unknown }).toMillis !== "function"
    )
      throw new Error("Nhật ký cloud không hợp lệ.");
    const chunks = await getDocs(collection(changes, id, "chunks"));
    const values = new Map(chunks.docs.map((chunk) => [chunk.id, chunk.data().payload]));
    let payload = "";
    for (let index = 0; index < Number(raw.parts); index++) {
      const value = values.get(String(index));
      if (typeof value !== "string") throw new Error("Dữ liệu cloud chưa đầy đủ. Hãy thử đồng bộ lại.");
      payload += value;
    }
    const change = JSON.parse(payload) as Change;
    if (
      change.id !== id ||
      change.deviceId !== raw.deviceId ||
      change.generation !== raw.generation ||
      change.kind !== raw.kind
    )
      throw new Error("Nhật ký cloud không khớp.");
    const result = { change, order: Number(raw.order), committedAt: (raw.at as { toMillis(): number }).toMillis() };
    cached.set(id, result);
    return result;
  }
  return {
    subscribe(next, error) {
      let active = true;
      let sequence = Promise.resolve();
      const unsubscribe = onSnapshot(
        query(changes, orderBy("order")),
        (snapshot) => {
          // Serialize snapshots so an older async chunk read cannot replace newer data.
          sequence = sequence
            .then(async () => {
              const entries = await Promise.all(snapshot.docs.map((entry) => readEntry(entry.id, entry.data())));
              if (active) next(entries);
            })
            .catch((reason) => {
              if (active) error(reason);
            });
        },
        error,
      );
      return () => {
        active = false;
        unsubscribe();
        cached.clear();
      };
    },
    async append(change) {
      const payload = JSON.stringify(change);
      const parts = splitPayload(payload);
      const ref = doc(changes, change.id);
      await runTransaction(db, async (tx) => {
        const [existing, current] = await Promise.all([tx.get(ref), tx.get(head)]);
        if (existing.exists()) return;
        const generation = current.data()?.generation ?? "initial";
        if (generation !== change.generation)
          throw new Error("Tài khoản đã khôi phục dữ liệu ở máy khác. Hãy xuất bản sao trước khi dùng dữ liệu mới.");
        const order = (current.data()?.revision ?? 0) + 1;
        tx.set(head, {
          version: 1,
          revision: order,
          generation: change.kind === "restore" ? change.id : generation,
          latestId: change.id,
          updatedAt: serverTimestamp(),
        });
        tx.set(ref, {
          version: 1,
          deviceId: change.deviceId,
          generation,
          kind: change.kind,
          order,
          at: serverTimestamp(),
          parts: parts.length,
        });
        parts.forEach((part, index) => tx.set(doc(ref, "chunks", String(index)), { payload: part }));
      });
      const stored = await getDocFromServer(ref);
      return readEntry(change.id, stored.data()!);
    },
  };
}
export function cloudError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return "Bạn đã đóng cửa sổ đăng nhập. Có thể thử lại khi sẵn sàng.";
  if (code === "auth/popup-blocked") return "Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại.";
  if (code === "auth/unauthorized-domain")
    return "Domain này chưa được cho phép đăng nhập trong Firebase Authentication.";
  if (code === "auth/operation-not-allowed") return "Cần bật Google trong Firebase Authentication của project mới.";
  if (code.includes("permission-denied"))
    return "Chưa truy cập được dữ liệu cloud. Hãy kiểm tra Firestore Rules của project vocab-web-next.";
  if (code.includes("network-request-failed") || code.includes("unavailable"))
    return "Chưa kết nối được máy chủ. Tiến độ vẫn lưu trên máy và sẽ thử lại.";
  return error instanceof Error ? error.message : "Chưa đồng bộ được. Tiến độ vẫn được giữ trên máy.";
}
