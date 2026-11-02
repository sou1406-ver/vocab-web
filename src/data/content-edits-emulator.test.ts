import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential, type Auth } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  type Firestore,
} from "firebase/firestore";
import { removeContentEdit, saveContentEdit } from "./content-edits-cloud";
import { defaultBook } from "./catalog";
import { editId } from "./content-edits";

describe.skipIf(process.env.FIREBASE_SYNC_EMULATOR_TEST !== "1")("Content edit rules", () => {
  const run = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const apps: FirebaseApp[] = [];
  const databases: Firestore[] = [];
  let reviewer: { uid: string; db: Firestore; auth: Auth };
  let learner: { uid: string; db: Firestore; auth: Auth };
  let anonymous: Firestore;
  const word = defaultBook.catalog.words[0];
  beforeAll(async () => {
    const client = async (subject: string, signIn = true) => {
      const app = initializeApp({ apiKey: "fake-key", projectId: "demo-vocab-sync" }, `${run}-${subject}`);
      apps.push(app);
      const auth = getAuth(app);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      const db = getFirestore(app);
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      databases.push(db);
      if (!signIn) return { uid: "", db, auth };
      const result = await signInWithCredential(
        auth,
        GoogleAuthProvider.credential(
          JSON.stringify({ sub: `${run}-${subject}`, email: `${subject}-${run}@example.test`, email_verified: true }),
        ),
      );
      return { uid: result.user.uid, db, auth };
    };
    reviewer = await client("reviewer");
    learner = await client("learner");
    anonymous = (await client("anonymous", false)).db;
    const grant = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-vocab-sync/accounts:update",
      {
        method: "POST",
        headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
        body: JSON.stringify({ localId: reviewer.uid, customAttributes: JSON.stringify({ contentReviewer: true }) }),
      },
    );
    expect(grant.ok).toBe(true);
    await reviewer.auth.currentUser!.getIdToken(true);
  }, 30000);
  afterAll(async () => {
    await Promise.all(databases.map((db) => terminate(db)));
    await Promise.all(apps.map((app) => deleteApp(app)));
  });

  it("lets only the reviewer claim write, and anyone read", async () => {
    const edit = {
      kind: "word" as const,
      bookId: defaultBook.id,
      target: word.id,
      data: { ...word, meaning: `sửa ${run}` },
      hidden: false,
    };
    await expect(saveContentEdit(edit, learner.uid, learner.db)).rejects.toMatchObject({ code: "permission-denied" });
    await saveContentEdit(edit, reviewer.uid, reviewer.db);
    const listed = await getDocs(query(collection(anonymous, "contentEdits"), limit(300)));
    expect(listed.docs.some((entry) => entry.id === editId("word", defaultBook.id, word.id))).toBe(true);
    await expect(removeContentEdit(editId("word", defaultBook.id, word.id), learner.db)).rejects.toMatchObject({
      code: "permission-denied",
    });
    await removeContentEdit(editId("word", defaultBook.id, word.id), reviewer.db);
  });

  it("rejects malformed documents even from the reviewer", async () => {
    const id = editId("topic", defaultBook.id, "x");
    const valid = {
      version: 1,
      kind: "topic",
      bookId: defaultBook.id,
      target: "x",
      data: JSON.stringify({ title: "T" }),
      hidden: false,
      updatedAt: serverTimestamp(),
      updatedBy: reviewer.uid,
    };
    await expect(setDoc(doc(reviewer.db, "contentEdits", "wrong-id"), valid)).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(setDoc(doc(reviewer.db, "contentEdits", id), { ...valid, extra: 1 })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(
      setDoc(doc(reviewer.db, "contentEdits", id), { ...valid, updatedBy: learner.uid }),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(
      setDoc(doc(reviewer.db, "contentEdits", id), { ...valid, data: "x".repeat(50001) }),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(setDoc(doc(reviewer.db, "contentEdits", id), { ...valid, lessonId: 1 })).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("is readable over REST without the SDK, exactly as learners fetch it", async () => {
    const edit = {
      kind: "word" as const,
      bookId: defaultBook.id,
      target: word.id,
      data: { ...word, meaning: `rest ${run}` },
      hidden: false,
    };
    await saveContentEdit(edit, reviewer.uid, reviewer.db);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATORS", "1");
    vi.stubGlobal("location", { hostname: "127.0.0.1" });
    vi.resetModules();
    try {
      const { fetchContentEdits } = await import("../state/content-sync");
      const edits = await fetchContentEdits();
      expect(edits.find((item) => item.target === word.id)).toMatchObject({
        kind: "word",
        hidden: false,
        data: { meaning: `rest ${run}` },
      });
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      await removeContentEdit(editId("word", defaultBook.id, word.id), reviewer.db);
    }
  });

  it("lets the reviewer list up to 500 leaderboard entries", async () => {
    await expect(getDocs(query(collection(reviewer.db, "leaderboard"), limit(500)))).resolves.toBeDefined();
    await expect(getDocs(query(collection(learner.db, "leaderboard"), limit(500)))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
