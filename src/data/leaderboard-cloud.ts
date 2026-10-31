import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
  type Firestore,
} from "firebase/firestore";
import { firebaseClient } from "../lib/firebase";
import { readCultivator, validCultivatorName, type Cultivator } from "../domain/cultivation";

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

export async function joinLeaderboard(
  uid: string,
  nickname: string,
  learnedCount: number,
  avatar: number,
  db: Firestore = firebaseClient().db,
) {
  const name = nickname.trim();
  if (!validCultivatorName(name)) throw new Error("Biệt danh cần 2–32 ký tự, không dùng email hoặc xuống dòng.");
  readCultivator(uid, { version: 1, nickname: name, avatar, learnedCount, updatedAt: 0 });
  await setDoc(doc(db, "leaderboard", uid), {
    version: 1,
    nickname: name,
    avatar,
    learnedCount,
    updatedAt: serverTimestamp(),
  });
}

export function leaveLeaderboard(uid: string, db: Firestore = firebaseClient().db) {
  return deleteDoc(doc(db, "leaderboard", uid));
}

// A transaction cannot recreate a profile after the user leaves the leaderboard.
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
    const current = await tx.get(ref);
    if (
      !isCurrent() ||
      !current.exists() ||
      (current.data().learnedCount === learnedCount && current.data().avatar === avatar)
    )
      return;
    tx.update(ref, { learnedCount, avatar, updatedAt: serverTimestamp() });
  });
}
