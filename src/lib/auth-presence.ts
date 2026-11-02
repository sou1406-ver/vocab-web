// Tells whether this browser holds a Firebase sign-in, without downloading the Firebase SDK.
// Firebase stores the user as "firebase:authUser:<apiKey>:<app>" in the IndexedDB database below,
// or in localStorage when IndexedDB is unavailable. Any doubt answers true so a signed-in user is never missed.
const DATABASE = "firebaseLocalStorageDb";
const STORE = "firebaseLocalStorage";
const USER_KEY = "firebase:authUser:";

export async function hasStoredAuthUser(): Promise<boolean> {
  try {
    for (let index = 0; index < localStorage.length; index++)
      if (localStorage.key(index)?.startsWith(USER_KEY)) return true;
  } catch {
    /* Storage blocked: fall through to IndexedDB. */
  }
  try {
    if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") return true;
    // Listing first means we never open, and so never create, a database Firebase has not made yet.
    if (!(await indexedDB.databases()).some((database) => database.name === DATABASE)) return false;
    return await new Promise<boolean>((resolve) => {
      const open = indexedDB.open(DATABASE);
      // Only reached if the database vanished meanwhile: abort so an empty one is not left for Firebase to trip on.
      open.onupgradeneeded = () => {
        open.transaction?.abort();
        resolve(false);
      };
      open.onerror = () => resolve(true);
      open.onblocked = () => resolve(true);
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.close();
          resolve(true);
          return;
        }
        const keys = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
        keys.onsuccess = () => {
          db.close();
          resolve(keys.result.some((key) => String(key).startsWith(USER_KEY)));
        };
        keys.onerror = () => {
          db.close();
          resolve(true);
        };
      };
    });
  } catch {
    return true;
  }
}
