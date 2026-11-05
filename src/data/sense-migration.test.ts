import { describe, expect, it } from "vitest";
import { defaultBook } from "./catalog";
import { migrateLearningSnapshot, senseMigration } from "./sense-migration";
import { validateSnapshot } from "./validation";
import { emptySnapshot } from "../domain/learning";
import { replaySkills } from "../domain/skills";
import { createChange, importChange, materialize } from "./sync";
import type { AnswerEvent, Snapshot } from "../domain/types";
import source from "../../content/lexicon/pilot.json";
import bindings from "../../content/books/toeic-600/senses.json";
import { compileLexicon } from "../../scripts/lib/lexicon-content.mjs";

const pilotWords = compileLexicon(defaultBook.catalog.words, source, bindings, "toeic-600");

const at = Date.parse("2026-11-01T03:00:00Z");
const legacy = (): Snapshot => ({
  ...emptySnapshot(),
  progress: {
    "charge-19": {
      startedAt: at,
      startedDay: "2026-11-01",
      box: 4,
      dueAt: at + 86400000,
      correct: 11,
      incorrect: 2,
      tested: true,
      policyVersion: 1,
    },
  },
  events: [
    {
      id: "old:0",
      sessionId: "old",
      wordId: "charge-19",
      at,
      day: "2026-11-01",
      correct: true,
      assisted: false,
      mode: "learn",
    },
    {
      id: "known:0",
      sessionId: "known",
      wordId: "charge-19",
      at,
      day: "2026-11-01",
      correct: true,
      assisted: false,
      mode: "learn",
      questionKind: "recall",
      contentVersion: "cbd94fa970e5",
      scoringVersion: 2,
      hintCount: 0,
      hintLimit: 1,
    },
  ],
  session: {
    id: "running",
    title: "Old lesson",
    contentVersion: "cbd94fa970e5",
    mode: "review",
    startedAt: at,
    index: 0,
    phase: "question",
    feedback: null,
    questions: [{ wordId: "charge-19", kind: "recall", prompt: "thu phí; khoản phí", answer: "charge", options: [] }],
  },
});
describe("sense identity migration and compatibility", () => {
  it("preserves every old snapshot field and resolves legacy IDs without granting newly added senses progress", () => {
    const raw = legacy();
    const before = JSON.stringify(raw);
    const migrated = migrateLearningSnapshot(validateSnapshot(raw), pilotWords);
    expect(JSON.stringify(migrated)).toBe(before);
    expect(migrateLearningSnapshot(migrated, pilotWords)).toBe(migrated);
    expect(replaySkills(migrated.events)).toEqual(replaySkills(legacy().events));
    const migration = senseMigration(pilotWords);
    expect(migration.version).toBe(1);
    expect(migration.items.get("charge-19")?.senseId).toBe("ask-payment");
    expect(migrated.progress["toeic-600:charge-19:fee"]).toBeUndefined();
    expect(migrated.events[0]).not.toHaveProperty("senseCheck");
  });
  it("retains optional sense metadata through validation and rejects malformed metadata", () => {
    const event: AnswerEvent = {
      ...legacy().events[1],
      id: "new:0",
      sessionId: "new",
      scoringVersion: 5,
      senseCheck: {
        wordId: "charge-19",
        lexemeId: "en:charge",
        senseId: "fee",
        itemIds: ["charge-19"],
        requiredItemIds: ["charge-19"],
        role: "diagnostic",
      },
    };
    expect(validateSnapshot({ ...legacy(), events: [event] }).events[0]).toEqual(event);
    for (const bad of [
      { ...event, senseCheck: { ...event.senseCheck, role: "unknown" } },
      { ...event, senseCheck: { ...event.senseCheck, itemIds: [] } },
      { ...event, senseCheck: { ...event.senseCheck, senseId: 42 } },
    ])
      expect(() => validateSnapshot({ ...legacy(), events: [bad] })).toThrow();
  });
  it("syncs diagnostic and repair events without changing progress or skill schedules or duplicating events", () => {
    const before = { ...legacy(), session: null };
    for (const role of ["diagnostic", "repair"] as const) {
      const event: AnswerEvent = {
        ...before.events[1],
        id: `${role}:0`,
        sessionId: role,
        at: at + 86400001,
        scoringVersion: 5,
        correct: false,
        senseCheck: {
          wordId: "charge-19",
          lexemeId: "en:charge",
          senseId: "ask-payment",
          itemIds: ["charge-19"],
          requiredItemIds: ["charge-19"],
          role,
        },
      };
      const after = { ...before, events: [...before.events, event] };
      const change = createChange(before, after, role, "device", "initial")!;
      const seed = { change: importChange(before, "seed", "device", "initial"), order: 1, committedAt: at };
      const commit = { change, order: 2, committedAt: at + 86400001 };
      const synced = materialize([seed, commit, commit]);
      expect(synced.progress).toEqual(before.progress);
      expect(synced.events).toHaveLength(3);
      expect(replaySkills(synced.events)).toEqual(replaySkills(before.events));
    }
  });
});
