import { emptySnapshot } from "../domain/learning";
import type { Snapshot } from "../domain/types";
import { validateSnapshot } from "./validation";

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
export async function readSnapshot(): Promise<Snapshot> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshots", "readonly");
    const request = tx.objectStore("snapshots").get("guest");
    request.onsuccess = () => {
      try {
        resolve(request.result ? validateSnapshot(request.result) : emptySnapshot());
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function changeSnapshot(reducer: (snapshot: Snapshot) => Snapshot): Promise<Snapshot> {
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
