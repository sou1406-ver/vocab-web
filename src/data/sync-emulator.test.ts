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
  setDoc,
  terminate,
  type Firestore,
} from "firebase/firestore";
import { firestoreTransport } from "../lib/firebase";
import { createChange, importChange, materialize } from "./sync";
import { emptySnapshot } from "../domain/learning";

// Run only against the local emulators; never against the real project.
describe.skipIf(process.env.FIREBASE_SYNC_EMULATOR_TEST !== "1")(
  "Auth + Firestore synchronization and private rules",
  () => {
    const apps: FirebaseApp[] = [];
    const databases: Firestore[] = [];
    let a: { uid: string; db: Firestore };
    let second: { uid: string; db: Firestore };
    let b: { uid: string; db: Firestore };
    let guest: Firestore;
    const runId = crypto.randomUUID();
    async function client(name: string, subject?: string) {
      const app = initializeApp({ apiKey: "fake-key", projectId: "demo-vocab-sync" }, `${runId}-${name}`);
      apps.push(app);
      const auth = getAuth(app);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      const db = getFirestore(app);
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      databases.push(db);
      if (!subject) return { uid: "", db };
      const token = JSON.stringify({
        sub: `${runId}-${subject}`,
        email: `${subject}-${runId}@example.test`,
        email_verified: true,
      });
      const result = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
      return { uid: result.user.uid, db };
    }
    beforeAll(async () => {
      a = await client("a", "a");
      second = await client("second", "a");
      b = await client("b", "b");
      guest = (await client("guest")).db;
    }, 30000);
    afterAll(async () => {
      await Promise.all(databases.map((db) => terminate(db)));
      await Promise.all(apps.map((app) => deleteApp(app)));
    });
    it("two authenticated clients converge and retry cannot create duplicate operations", async () => {
      expect(second.uid).toBe(a.uid);
      const empty = emptySnapshot();
      const first = createChange(empty, { ...empty, savedWords: ["a"] }, "first", "a", "initial")!;
      const other = createChange(
        empty,
        { ...empty, settings: { ...empty.settings, dailyNew: 5 } },
        "other",
        "b",
        "initial",
      )!;
      const one = firestoreTransport(a.uid, a.db);
      const two = firestoreTransport(a.uid, second.db);
      const committed = await Promise.all([one.append(first), two.append(other)]);
      expect(new Set(committed.map((entry) => entry.order)).size).toBe(2);
      expect(committed.every((entry) => entry.committedAt > 0)).toBe(true);
      expect(materialize(committed)).toMatchObject({ savedWords: ["a"], settings: { dailyNew: 5 } });
      await one.append(first);
      expect((await getDocs(collection(a.db, "users", a.uid, "changes"))).size).toBe(2);
    }, 30000);
    it("denies unauthenticated and other-account reads and writes", async () => {
      for (const db of [guest, b.db]) {
        await expect(getDocs(collection(db, "users", a.uid, "changes"))).rejects.toMatchObject({
          code: "permission-denied",
        });
        await expect(getDoc(doc(db, "users", a.uid, "sync", "state"))).rejects.toMatchObject({
          code: "permission-denied",
        });
        await expect(setDoc(doc(db, "users", a.uid, "changes", "injected"), { x: 1 })).rejects.toMatchObject({
          code: "permission-denied",
        });
      }
    });
    it("denies malformed counters, orphan chunks, journal mutation and deletion", async () => {
      await expect(
        setDoc(doc(a.db, "users", a.uid, "sync", "state"), {
          version: 1,
          revision: 999,
          latestId: "bad",
          generation: "initial",
        }),
      ).rejects.toMatchObject({ code: "permission-denied" });
      await expect(
        setDoc(doc(a.db, "users", a.uid, "changes", "missing", "chunks", "0"), { payload: "injected" }),
      ).rejects.toMatchObject({ code: "permission-denied" });
      await expect(
        setDoc(doc(a.db, "users", a.uid, "changes", "first", "chunks", "0"), { payload: "changed" }),
      ).rejects.toMatchObject({ code: "permission-denied" });
      await expect(deleteDoc(doc(a.db, "users", a.uid, "changes", "first"))).rejects.toMatchObject({
        code: "permission-denied",
      });
    });
    it("chunks a large Unicode legacy archive without losing the original", async () => {
      const snapshot = { ...emptySnapshot(), legacyArchives: [{ text: "từ vựng ".repeat(40000) }] };
      const transport = firestoreTransport(b.uid, b.db);
      const committed = await transport.append(importChange(snapshot, "large", "b", "initial"));
      expect(materialize([committed]).legacyArchives).toEqual(snapshot.legacyArchives);
      expect((await getDocs(collection(b.db, "users", b.uid, "changes", "large", "chunks"))).size).toBeGreaterThan(1);
    });
    it("a restore changes generation and blocks stale offline writes", async () => {
      const transport = firestoreTransport(a.uid, a.db);
      await transport.append({
        version: 1,
        id: "restore",
        deviceId: "a",
        kind: "restore",
        generation: "initial",
        patch: {},
        restored: emptySnapshot(),
      });
      const stale = createChange(
        emptySnapshot(),
        { ...emptySnapshot(), savedWords: ["stale"] },
        "stale",
        "b",
        "initial",
      )!;
      await expect(firestoreTransport(a.uid, second.db).append(stale)).rejects.toThrow(/khôi phục/);
      const next = { ...stale, id: "fresh", generation: "restore" };
      await expect(transport.append(next)).resolves.toMatchObject({ change: { id: "fresh" } });
    });
  },
);
