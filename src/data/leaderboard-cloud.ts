import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
  type Firestore,
} from "firebase/firestore";
import { validUsername } from "../domain/account";
import { firebaseClient } from "../lib/firebase";
import { readCultivator, type Cultivator } from "../domain/cultivation";

function readEntry(snapshot: DocumentSnapshot): Cultivator | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data({ serverTimestamps: "estimate" });
  const updatedAt = data.updatedAt?.toMillis?.();
  return readCultivator(snapshot.id, { ...data, updatedAt });
}

export function watchLeaderboard(
  next: (entries: Cultivator[]) => void,
  error: (error: unknown) => void,
  db: Firestore = firebaseClient().db,
) {
  return onSnapshot(
    query(collection(db, "leaderboard"), orderBy("learnedCount", "desc"), limit(50)),
    (snapshot) => {
      try {
        next(
          snapshot.docs.flatMap((entry) => {
            try {
              const value = readEntry(entry);
              return value ? [value] : [];
            } catch {
              return [];
            } // An incompatible profile must not hide everyone else.
          }),
        );
      } catch (reason) {
        error(reason);
      }
    },
    error,
  );
}

export function watchCultivator(
  uid: string,
  next: (entry: Cultivator | null) => void,
  error: (error: unknown) => void,
  db: Firestore = firebaseClient().db,
) {
  return onSnapshot(
    doc(db, "leaderboard", uid),
    (snapshot) => {
      try {
        next(readEntry(snapshot));
      } catch (reason) {
        error(reason);
      }
    },
    error,
  );
}

// Visibility and username are rechecked inside the score transaction.
export async function syncLeaderboardCount(
  uid: string,
  learnedCount: number,
  avatar: number,
  isCurrent = () => true,
  db: Firestore = firebaseClient().db,
) {
  await runTransaction(db, async (tx) => {
    if (!isCurrent()) return;
    const ref = doc(db, "leaderboard", uid);
    const [profile, current] = await Promise.all([tx.get(doc(db, "profiles", uid)), tx.get(ref)]);
    if (!isCurrent() || !profile.exists()) return;
    const account = profile.data();
    if (typeof account.username !== "string" || !validUsername(account.username)) return;
    if (account.hiddenLeaderboard) {
      if (current.exists()) tx.delete(ref);
      return;
    }
    if (
      current.exists() &&
      current.data().learnedCount === learnedCount &&
      current.data().avatar === avatar &&
      current.data().username === account.username
    )
      return;
    tx.set(ref, { version: 1, username: account.username, avatar, learnedCount, updatedAt: serverTimestamp() });
  });
}
