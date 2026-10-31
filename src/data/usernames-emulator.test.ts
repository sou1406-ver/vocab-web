import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { claimUsername, setLeaderboardHidden } from "./account-profile";

describe.skipIf(process.env.FIREBASE_SYNC_EMULATOR_TEST !== "1")("Unique usernames and incomplete accounts", () => {
  const run = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const apps: FirebaseApp[] = [];
  const databases: Firestore[] = [];
  let a: { uid: string; db: Firestore };
  let b: { uid: string; db: Firestore };
  beforeAll(async () => {
    const client = async (subject: string) => {
      const app = initializeApp({ apiKey: "fake-key", projectId: "demo-vocab-sync" }, `${run}-${subject}`);
      apps.push(app);
      const auth = getAuth(app);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      const db = getFirestore(app);
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      databases.push(db);
      const result = await signInWithCredential(
        auth,
        GoogleAuthProvider.credential(
          JSON.stringify({ sub: `${run}-${subject}`, email: `${subject}-${run}@example.test`, email_verified: true }),
        ),
      );
      return { uid: result.user.uid, db };
    };
    a = await client("a");
    b = await client("b");
  }, 30000);
  afterAll(async () => {
    await Promise.all(databases.map((db) => terminate(db)));
    await Promise.all(apps.map((app) => deleteApp(app)));
  });

  it("does not allow incomplete accounts to sync or publish rankings", async () => {
    expect((await getDoc(doc(a.db, "profiles", a.uid))).exists()).toBe(false);
    await expect(getDocs(collection(a.db, "users", a.uid, "changes"))).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(getDocs(query(collection(a.db, "leaderboard"), limit(50)))).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(
      setDoc(doc(a.db, "leaderboard", a.uid), {
        version: 1,
        username: "unclaimed",
        avatar: 0,
        learnedCount: 0,
        updatedAt: serverTimestamp(),
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("atomically gives a contested username to exactly one of two accounts", async () => {
    const name = `user_${run}`;
    const attempts = await Promise.allSettled([claimUsername(a.uid, name, a.db), claimUsername(b.uid, name, b.db)]);
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const reservation = await getDoc(doc(a.db, "usernames", name));
    expect([a.uid, b.uid]).toContain(reservation.data()!.uid);
    for (const account of [a, b]) {
      const profile = await getDoc(doc(account.db, "profiles", account.uid));
      expect(profile.exists()).toBe(reservation.data()!.uid === account.uid);
      expect((await getDoc(doc(account.db, "leaderboard", account.uid))).exists()).toBe(false);
    }
  });
  it("renames and releases the old reservation in the same transaction", async () => {
    const oldName = `old_${run}`,
      newName = `new_${run}`;
    await claimUsername(a.uid, oldName, a.db);
    await claimUsername(a.uid, newName, a.db);
    expect((await getDoc(doc(a.db, "usernames", oldName))).exists()).toBe(false);
    expect((await getDoc(doc(a.db, "profiles", a.uid))).data()!.username).toBe(newName);
    await claimUsername(b.uid, oldName, b.db);
    expect((await getDoc(doc(a.db, "usernames", oldName))).data()!.uid).toBe(b.uid);
    await expect(deleteDoc(doc(b.db, "usernames", newName))).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("rejects invalid names even when bypassing the client validator", async () => {
    const oldName = (await getDoc(doc(a.db, "profiles", a.uid))).data()!.username;
    for (const name of ["ab", "UpperCase", "bad-name", "bad name", "a".repeat(21)]) {
      const batch = writeBatch(a.db);
      batch.set(doc(a.db, "usernames", name), { uid: a.uid });
      batch.set(doc(a.db, "profiles", a.uid), {
        version: 1,
        username: name,
        hiddenLeaderboard: false,
        updatedAt: serverTimestamp(),
      });
      batch.delete(doc(a.db, "usernames", oldName));
      await expect(batch.commit()).rejects.toMatchObject({ code: "permission-denied" });
    }
    await expect(setDoc(doc(a.db, "usernames", `orphan_${run}`), { uid: a.uid })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(deleteDoc(doc(a.db, "usernames", oldName))).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("rejects a rename that leaves a stale username on an existing ranking", async () => {
    await claimUsername(a.uid, `rename_${run}`, a.db);
    const username = (await getDoc(doc(a.db, "profiles", a.uid))).data()!.username;
    await setDoc(doc(a.db, "leaderboard", a.uid), {
      version: 1,
      username,
      avatar: 0,
      learnedCount: 5,
      updatedAt: serverTimestamp(),
    });
    const next = `stale_${run}`;
    const batch = writeBatch(a.db);
    batch.set(doc(a.db, "usernames", next), { uid: a.uid });
    batch.set(doc(a.db, "profiles", a.uid), {
      version: 1,
      username: next,
      hiddenLeaderboard: false,
      updatedAt: serverTimestamp(),
    });
    batch.delete(doc(a.db, "usernames", username));
    await expect(batch.commit()).rejects.toMatchObject({ code: "permission-denied" });
    expect((await getDoc(doc(a.db, "profiles", a.uid))).data()!.username).toBe(username);
    await claimUsername(a.uid, next, a.db);
    expect((await getDoc(doc(a.db, "leaderboard", a.uid))).data()!.username).toBe(next);
  });
  it("hides the public ranking while retaining the account username", async () => {
    const username = (await getDoc(doc(a.db, "profiles", a.uid))).data()!.username;
    await setDoc(doc(a.db, "leaderboard", a.uid), {
      version: 1,
      username,
      avatar: 0,
      learnedCount: 5,
      updatedAt: serverTimestamp(),
    });
    await setLeaderboardHidden(a.uid, true, a.db);
    expect((await getDoc(doc(a.db, "leaderboard", a.uid))).exists()).toBe(false);
    expect((await getDoc(doc(a.db, "usernames", username))).data()!.uid).toBe(a.uid);
    expect((await getDoc(doc(a.db, "profiles", a.uid))).data()!.hiddenLeaderboard).toBe(true);
  });
});
