import { doc, onSnapshot, runTransaction, serverTimestamp, type Firestore } from "firebase/firestore";
import { firebaseClient } from "../lib/firebase";
import { readAccountProfile, validUsername, type AccountProfile } from "../domain/account";

const cacheKey = (db: Firestore, uid: string) => `vocab:account-profile:v1:${db.app.options.projectId}:${uid}`;
function cachedProfile(db: Firestore, uid: string): AccountProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(cacheKey(db, uid));
    return saved ? readAccountProfile(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}
function cacheProfile(db: Firestore, uid: string, profile: AccountProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile) window.localStorage.setItem(cacheKey(db, uid), JSON.stringify(profile));
    else window.localStorage.removeItem(cacheKey(db, uid));
  } catch {
    /* The confirmed profile can still be used for this visit. */
  }
}

export function watchAccountProfile(
  uid: string,
  next: (profile: AccountProfile | null) => void,
  error: (reason: unknown) => void,
  db: Firestore = firebaseClient().db,
) {
  const cached = cachedProfile(db, uid);
  if (cached) next(cached);
  else if (typeof navigator !== "undefined" && !navigator.onLine) next(null);
  return onSnapshot(
    doc(db, "profiles", uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites || (!snapshot.exists() && snapshot.metadata.fromCache)) return;
      try {
        const data = snapshot.data();
        const profile = data ? readAccountProfile({ ...data, updatedAt: data.updatedAt?.toMillis?.() }) : null;
        cacheProfile(db, uid, profile);
        next(profile);
      } catch (reason) {
        error(reason);
      }
    },
    (reason) => {
      if (reason.code === "permission-denied") {
        cacheProfile(db, uid, null);
        next(null);
      }
      error(reason);
    },
  );
}

export async function claimUsername(uid: string, username: string, db: Firestore = firebaseClient().db) {
  if (!validUsername(username)) throw new Error("Username gồm 3–20 chữ thường a–z, chữ số hoặc dấu gạch dưới.");
  await runTransaction(db, async (tx) => {
    const profileRef = doc(db, "profiles", uid);
    const nameRef = doc(db, "usernames", username);
    const rankingRef = doc(db, "leaderboard", uid);
    const [profile, name, ranking] = await Promise.all([tx.get(profileRef), tx.get(nameRef), tx.get(rankingRef)]);
    const previous = profile.data();
    if (name.exists() && (name.data().uid !== uid || previous?.username !== username))
      throw new Error("Username này đã được sử dụng. Hãy chọn tên khác.");
    const oldRef =
      previous?.username && previous.username !== username ? doc(db, "usernames", previous.username) : null;
    const old = oldRef ? await tx.get(oldRef) : null;
    if (old?.exists() && old.data().uid !== uid) throw new Error("Chưa xác nhận được username hiện tại.");
    if (!name.exists()) tx.set(nameRef, { uid });
    tx.set(profileRef, {
      version: 1,
      username,
      hiddenLeaderboard: previous?.hiddenLeaderboard ?? false,
      updatedAt: serverTimestamp(),
    });
    if (oldRef && old?.exists()) tx.delete(oldRef);
    if (ranking.exists()) {
      if (previous?.hiddenLeaderboard) tx.delete(rankingRef);
      else tx.update(rankingRef, { username, updatedAt: serverTimestamp() });
    }
  });
}

export async function setLeaderboardHidden(uid: string, hidden: boolean, db: Firestore = firebaseClient().db) {
  await runTransaction(db, async (tx) => {
    const profileRef = doc(db, "profiles", uid);
    const rankingRef = doc(db, "leaderboard", uid);
    const [profile, ranking] = await Promise.all([tx.get(profileRef), tx.get(rankingRef)]);
    if (!profile.exists()) throw new Error("Hãy chọn username trước.");
    tx.update(profileRef, { hiddenLeaderboard: hidden, updatedAt: serverTimestamp() });
    if (hidden && ranking.exists()) tx.delete(rankingRef);
  });
}
