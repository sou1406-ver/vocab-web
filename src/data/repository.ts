import { emptySnapshot } from "../domain/learning";
import type { Snapshot } from "../domain/types";
import { validateSnapshot } from "./validation";
import { createChange, generationOf, newAccount, type AccountRecord } from "./sync";

let database: Promise<IDBDatabase> | undefined;
function open() {
  if (database) return database;
  const attempt = new Promise<IDBDatabase>((resolve, reject) => {
    let abandoned = false;
    const request = indexedDB.open("vocab-learn-v2", 1);
    request.onupgradeneeded = () => {
      if (abandoned) request.transaction?.abort();
      else request.result.createObjectStore("snapshots");
    };
    request.onsuccess = () => {
      if (abandoned) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => {
        request.result.close();
        if (database === attempt) database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      abandoned = true;
      reject(request.error);
    };
    request.onblocked = () => {
      abandoned = true;
      reject(new Error("Hãy đóng tab Vocab cũ để mở dữ liệu học."));
    };
  });
  database = attempt;
  void attempt.catch(() => {
    if (database === attempt) database = undefined;
  });
  return attempt;
}
export async function readSnapshot(profile = "guest"): Promise<Snapshot> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readonly");
    const request = tx.objectStore("snapshots").get(profile);
    request.onsuccess = () => {
      try {
        const raw = profile === "guest" ? request.result : request.result?.snapshot;
        resolve(raw ? validateSnapshot(raw) : emptySnapshot());
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
let fallbackDevice: string | undefined;
export function deviceId() {
  fallbackDevice ??= crypto.randomUUID();
  try {
    const existing = localStorage.getItem("vocab-sync-device");
    if (existing) return existing;
    localStorage.setItem("vocab-sync-device", fallbackDevice);
  } catch {
    /* A durable operation UUID still makes retries idempotent without localStorage. */
  }
  return fallbackDevice;
}
export async function readAccount(profile: string): Promise<AccountRecord> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readonly");
    const request = tx.objectStore("snapshots").get(profile);
    request.onsuccess = () => resolve(request.result ?? newAccount());
    request.onerror = () => reject(request.error);
  });
}
export async function updateAccount(
  profile: string,
  reduce: (account: AccountRecord) => AccountRecord,
): Promise<AccountRecord> {
  if (!profile.startsWith("user:")) throw new Error("Thiếu tài khoản cho dữ liệu đồng bộ.");
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readwrite");
    const store = tx.objectStore("snapshots");
    const read = store.get(profile);
    let result: AccountRecord;
    let reason: unknown;
    read.onsuccess = () => {
      try {
        const current: AccountRecord = read.result ?? newAccount();
        result = reduce(current);
        result.snapshot = validateSnapshot({ ...result.snapshot, revision: current.snapshot.revision + 1 });
        store.put(result, profile);
      } catch (error) {
        reason = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(reason ?? tx.error ?? new Error("Không lưu được dữ liệu tài khoản trên máy."));
    tx.onerror = () => {
      reason ??= tx.error;
    };
  });
}
export async function changeSnapshot(reducer: (snapshot: Snapshot) => Snapshot, profile = "guest"): Promise<Snapshot> {
  if (profile !== "guest") {
    const result = await updateAccount(profile, (account) => {
      const next = validateSnapshot(reducer(account.snapshot));
      const change = createChange(
        account.snapshot,
        next,
        crypto.randomUUID(),
        deviceId(),
        generationOf(account.confirmed, account.pending),
      );
      return { ...account, snapshot: next, pending: change ? [...account.pending, change] : account.pending };
    });
    return result.snapshot;
  }
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readwrite");
    const store = tx.objectStore("snapshots");
    const read = store.get("guest");
    let result: Snapshot;
    let reason: unknown;
    read.onsuccess = () => {
      try {
        const current = read.result ? validateSnapshot(read.result) : emptySnapshot();
        result = validateSnapshot({ ...reducer(current), revision: current.revision + 1 });
        store.put(result, "guest");
      } catch (error) {
        reason = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(reason ?? tx.error ?? new Error("Không lưu được. Hãy kiểm tra dung lượng trình duyệt và thử lại."));
    tx.onerror = () => {
      reason ??= tx.error;
    };
  });
}
